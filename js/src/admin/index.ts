import app from 'flarum/admin/app';
import { extend, override } from 'flarum/common/extend';
import EditTagModal from 'ext:flarum/tags/admin/components/EditTagModal';
import Button from 'flarum/common/components/Button';

const t = (key: string): string => app.translator.trans(`ernestdefoe-tag-covers.admin.${key}`, {}, true);

type Kind = 'cover' | 'logo';

interface ImageState {
  url: string | null;
  busy: boolean;
  error: string | null;
  pending?: File | null;
}

type UrlResponse = Partial<Record<'coverUrl' | 'logoUrl', string | null>>;

app.initializers.add('ernestdefoe-tag-covers', () => {
  extend(EditTagModal.prototype, 'fields', function (items) {
    // `this.tag`, not `attrs.model`: a tag being created has no model in its
    // attrs — the modal makes the record itself.
    const tag = this.tag || this.attrs.model;
    if (!tag) return;

    items.add('cover', imageField(this, tag, 'cover'), 4);
    items.add('logo', imageField(this, tag, 'logo'), 3);
  });

  /*
   * 🚨 A NEW tag's images are held, then sent the moment it has an id.
   *
   * There is nothing to attach a file to until the tag exists, and this field
   * used to simply not appear until then — so creating a tag meant saving it,
   * closing the modal, finding it again and reopening it to add the picture,
   * which nothing on screen told you. Now the file is picked with everything
   * else and uploaded right after the tag's first save, before the modal
   * closes, so a failure is still in front of the person who caused it.
   *
   * The wrap is on THIS save only and removes itself, so the next edit of the
   * same tag goes through the model's own save untouched.
   */
  override(EditTagModal.prototype, 'onsubmit', function (original, e) {
    const tag = this.tag;
    const held = Object.entries(((this as any).tagImages || {}) as Record<string, ImageState>)
      .filter(([, s]) => s.pending)
      .map(([kind, s]) => ({ kind: kind as Kind, file: s.pending as File }));

    if (tag && !tag.exists && held.length) {
      const save = tag.save;

      tag.save = function (this: any, ...args: any[]) {
        tag.save = save;

        return save.apply(this, args as any).then((result: any) => {
          // 🚨 Upload against what save() RETURNS, not the modal's record. A
          // create is answered with a new record pushed into the store; the
          // object the modal holds never learns its id, so posting against
          // it sent every held image to `/tag-covers/undefined`.
          const saved = result && typeof result.id === 'function' && result.id() ? result : tag;

          return Promise.all(
            held.map(({ kind, file }) =>
              upload(saved, kind, file).catch(() => {
                app.alerts.show({ type: 'error' }, t('failed_after_create'));
              })
            )
          ).then(() => result);
        });
      };
    }

    return original(e);
  });
});

/** POST one image for a tag that exists, and keep the store in step. */
function upload(tag: any, kind: Kind, file: File): Promise<string | null> {
  const attr = kind === 'logo' ? 'logoUrl' : 'coverUrl';
  const route = kind === 'logo' ? 'tag-logos' : 'tag-covers';
  const data = new FormData();
  data.append(kind, file);

  return app
    .request<UrlResponse>({
      method: 'POST',
      url: `${app.forum.attribute('apiUrl')}/${route}/${tag.id()}`,
      body: data,
      serialize: (raw: any) => raw, // FormData must not be JSON-encoded
    })
    .then((res) => {
      const url = (res && res[attr]) || null;
      tag.pushAttributes({ [attr]: url });
      return url;
    });
}

/**
 * One field, both images.
 *
 * `kind` is 'cover' or 'logo'. Everything except the endpoint, the attribute
 * and the wording is identical, and a second hand-written copy of an upload
 * field is a second place for the busy/error handling to drift.
 */
function imageField(modal: any, tag: any, kind: Kind) {
  const attr = kind === 'logo' ? 'logoUrl' : 'coverUrl';
  const route = kind === 'logo' ? 'tag-logos' : 'tag-covers';

  // Per-kind state, so uploading a logo does not put the cover field into a
  // spinner and vice versa.
  modal.tagImages ??= {};
  const s: ImageState = (modal.tagImages[kind] ??= {
    url: tag.attribute(attr) || null,
    busy: false,
    error: null,
  });

  const send = (method: 'POST' | 'DELETE', body: FormData | null) => {
    s.busy = true;
    s.error = null;
    m.redraw();

    return app
      .request<UrlResponse>({
        method,
        url: `${app.forum.attribute('apiUrl')}/${route}/${tag.id()}`,
        body,
        serialize: (raw: any) => raw, // FormData must not be JSON-encoded
      })
      .then((res) => {
        s.url = (res && res[attr]) || null;
        // Keep the store in step so other views pick the change up without
        // a reload.
        tag.pushAttributes({ [attr]: s.url });
      })
      .catch(() => {
        s.error = t('failed');
      })
      .then(() => {
        s.busy = false;
        m.redraw();
      });
  };

  const onpick = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    if (!tag.exists) {
      // Held until the tag is saved — see the onsubmit override.
      if (s.url && s.pending) URL.revokeObjectURL(s.url);
      s.pending = file;
      s.url = URL.createObjectURL(file);
      input.value = '';
      return;
    }

    const data = new FormData();
    data.append(kind, file);
    send('POST', data);
    input.value = '';
  };

  return m('.Form-group.TagCovers-field', [
    m('label', t(kind + '_label')),
    m('.helpText', t(kind + '_help')),

    s.url ? m('.TagCovers-preview', { className: kind === 'logo' ? 'TagCovers-preview--logo' : '' }, m('img', { src: s.url, alt: '' })) : null,

    m('.TagCovers-actions', [
      m('label.Button.TagCovers-pick', { disabled: s.busy }, [
        s.busy ? t('uploading') : s.url ? t('replace') : t('upload'),
        m('input', {
          type: 'file',
          accept: 'image/png,image/jpeg,image/webp,image/gif',
          disabled: s.busy,
          onchange: onpick,
        }),
      ]),
      s.url
        ? m(
            Button,
            {
              className: 'Button Button--danger',
              disabled: s.busy,
              onclick: () => {
                if (s.pending) {
                  if (s.url) URL.revokeObjectURL(s.url);
                  s.pending = null;
                  s.url = null;
                  return;
                }
                send('DELETE', null);
              },
            },
            t('remove')
          )
        : null,
    ]),

    s.pending ? m('.helpText.TagCovers-pending', t('pending')) : null,
    s.error ? m('.TagCovers-error', s.error) : null,
  ]);
}
