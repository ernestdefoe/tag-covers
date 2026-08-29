import app from 'flarum/admin/app';
import { extend } from 'flarum/common/extend';
import EditTagModal from 'ext:flarum/tags/admin/components/EditTagModal';
import Button from 'flarum/common/components/Button';

const t = (key) => app.translator.trans(`ernestdefoe-tag-covers.admin.${key}`);

app.initializers.add('ernestdefoe-tag-covers', () => {
  extend(EditTagModal.prototype, 'fields', function (items) {
    const tag = this.attrs.model;

    // A tag being created has no id yet, so there is nothing to attach a
    // file to. The field appears once the tag has been saved.
    if (!tag || !tag.exists) return;

    items.add('cover', coverField(this, tag), 4);
  });
});

function coverField(modal, tag) {
  modal.coverUrl ??= tag.attribute('coverUrl') || null;
  modal.coverBusy ??= false;
  modal.coverError ??= null;

  const send = (method, body) => {
    modal.coverBusy = true;
    modal.coverError = null;
    m.redraw();

    return app
      .request({
        method,
        url: `${app.forum.attribute('apiUrl')}/tag-covers/${tag.id()}`,
        body,
        serialize: (raw) => raw, // FormData must not be JSON-encoded
      })
      .then((res) => {
        modal.coverUrl = (res && res.coverUrl) || null;
        // Keep the store in step so other views pick the change up without
        // a reload.
        try { tag.pushAttributes({ coverUrl: modal.coverUrl }); } catch (e) {}
      })
      .catch(() => { modal.coverError = t('failed'); })
      .then(() => { modal.coverBusy = false; m.redraw(); });
  };

  const onpick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const data = new FormData();
    data.append('cover', file);
    send('POST', data);
    e.target.value = '';
  };

  return m('.Form-group.TagCovers-field', [
    m('label', t('label')),
    m('.helpText', t('help')),

    modal.coverUrl
      ? m('.TagCovers-preview', m('img', { src: modal.coverUrl, alt: '' }))
      : null,

    m('.TagCovers-actions', [
      m('label.Button.TagCovers-pick', { disabled: modal.coverBusy }, [
        modal.coverBusy ? t('uploading') : (modal.coverUrl ? t('replace') : t('upload')),
        m('input', {
          type: 'file',
          accept: 'image/png,image/jpeg,image/webp,image/gif',
          disabled: modal.coverBusy,
          onchange: onpick,
        }),
      ]),
      modal.coverUrl
        ? m(Button, {
            className: 'Button Button--danger',
            disabled: modal.coverBusy,
            onclick: () => send('DELETE', null),
          }, t('remove'))
        : null,
    ]),

    modal.coverError ? m('.TagCovers-error', modal.coverError) : null,
  ]);
}
