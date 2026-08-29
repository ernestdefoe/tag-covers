import app from 'flarum/forum/app';

/**
 * Publishes each tag's cover as a CSS custom property.
 *
 * A stylesheet rather than walking the DOM: whatever renders a tag as a
 * card (Bespoke's forum cards, a tag tile, anything future) only has to
 * read `--tag-cover`, and nothing here needs to know that element exists.
 */
app.initializers.add('ernestdefoe-tag-covers', () => {
  const write = () => {
    let tags = [];
    try { tags = app.store.all('tags') || []; } catch (e) { return; }

    const rules = [];

    tags.forEach((tag) => {
      let url;
      let slug;
      try { url = tag.attribute('coverUrl'); slug = tag.slug(); } catch (e) { return; }
      if (!url || !slug) return;

      const css = `url("${String(url).replace(/"/g, '\\"')}")`;
      const esc = String(slug).replace(/"/g, '\\"');

      rules.push(
        `[data-tag-cover="${esc}"]{--tag-cover:${css};--cov:${css}}`,
        `.BespokeForum:has(a[href$="/t/${esc}"]){--tag-cover:${css};--cov:${css}}`,
        `.TagTile:has(a[href$="/t/${esc}"]),a.TagTile[href$="/t/${esc}"]{--tag-cover:${css};--cov:${css}}`
      );
    });

    let el = document.getElementById('tag-covers-css');
    if (!el) {
      el = document.createElement('style');
      el.id = 'tag-covers-css';
      document.head.appendChild(el);
    }

    const css = rules.join('\n');
    if (el.textContent !== css) el.textContent = css;
  };

  write();

  // Tags load lazily on most pages, so refresh the sheet after the store
  // settles rather than only at boot.
  const refresh = () => setTimeout(write, 0);
  document.addEventListener('DOMContentLoaded', refresh);
  setTimeout(write, 1200);
  setTimeout(write, 3000);
});
