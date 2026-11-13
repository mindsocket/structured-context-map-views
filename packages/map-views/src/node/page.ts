import type { SpaceSnapshot } from '../core/snapshot';

/** Where `fillPage` writes the page's title and snapshots in the template `scripts/build-page.ts` builds. */
export const PAGE_SLOTS = { title: '<!--sctx-title-->', snapshots: '<!--sctx-snapshots-->' } as const;

/**
 * A self-contained HTML page showing `snapshots` in the viewer: `template` (`dist/page.html`) with the title
 * and the snapshots written in. The page needs no network.
 */
export function fillPage(template: string, snapshots: SpaceSnapshot[], title: string): string {
  for (const slot of Object.values(PAGE_SLOTS)) {
    if (template.split(slot).length !== 2) throw new Error(`The page template must hold ${slot} exactly once.`);
  }
  // `<` escaped, so no string in the data can close the script element or open a comment
  const json = JSON.stringify(snapshots).replaceAll('<', '\\u003c');
  return template.replace(PAGE_SLOTS.title, () => escapeHtml(title)).replace(PAGE_SLOTS.snapshots, () => json);
}

function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
