import app from 'flarum/forum/app';

/**
 * Publishes each tag's images as CSS custom properties.
 *
 * A stylesheet rather than walking the DOM: whatever renders a tag as a
 * card (Bespoke's forum cards, a tag tile, anything future) only has to
 * read `--tag-cover` or `--tag-logo`, and nothing here needs to know that
 * element exists.
 *
 * 🚨 A stylesheet is also the only way the LOGO can reach a subforum chip.
 * The component that draws a chip renders a Font Awesome class or nothing —
 * it has no img — so a custom property the theme paints as a background is
 * what lets a chip carry a crest without every renderer being taught about
 * logos.
 */
app.initializers.add('ernestdefoe-tag-covers', () => {
  const write = () => {
    let tags = [];
    try { tags = app.store.all('tags') || []; } catch (e) { return; }

    const rules = [];

    tags.forEach((tag) => {
      let cover;
      let logo;
      let slug;
      try {
        cover = tag.attribute('coverUrl');
        logo = tag.attribute('logoUrl');
        slug = tag.slug();
      } catch (e) { return; }
      if (!slug || (!cover && !logo)) return;

      const esc = String(slug).replace(/"/g, '\\"');
      const url = (u) => `url("${String(u).replace(/"/g, '\\"')}")`;

      // Both kinds are declared in one block per selector, so a tag with a
      // logo and no cover still gets its logo — an earlier version bailed on
      // a missing cover and took the logo with it.
      const decl = [
        cover ? `--tag-cover:${url(cover)};--cov:${url(cover)}` : '',
        logo ? `--tag-logo:${url(logo)};--lg:${url(logo)}` : '',
      ].filter(Boolean).join(';');

      rules.push(
        `[data-tag-cover="${esc}"]{${decl}}`,
        // 🚨 DIRECT-child anchor, not any descendant. A forum card contains a
        // link for every subforum chip inside it, so `:has(a[href$=...])`
        // matched the card for each of its children too and the last child in
        // the sheet won — a conference card wore one of its teams' crests.
        // The card's own title link is its direct child; the chips are not.
        `.BespokeForum:has(> a[href$="/t/${esc}"]){${decl}}`,
        `.TagTile:has(> a[href$="/t/${esc}"]),a.TagTile[href$="/t/${esc}"]{${decl}}`,
        // A chip links to its own tag, so it IS the anchor rather than an
        // ancestor of one.
        `a.BespokeForum-sub[href$="/t/${esc}"]{${decl}}`
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
