import type { SpaceSnapshot } from '../core/snapshot';

export const PAGE_SLOTS = { title: '<!--sctx-title-->', snapshots: '<!--sctx-snapshots-->' } as const;

/** `template` (`dist/page.html`) with the title and snapshots written in. */
export function fillPage(template: string, snapshots: SpaceSnapshot[], title: string): string {
  for (const slot of Object.values(PAGE_SLOTS)) {
    if (template.split(slot).length !== 2) throw new Error(`The page template must hold ${slot} exactly once.`);
  }
  // Escaping `<` stops a string in the data ending the script element
  const json = JSON.stringify(snapshots).replaceAll('<', '\\u003c');
  return template.replace(PAGE_SLOTS.title, () => escapeHtml(title)).replace(PAGE_SLOTS.snapshots, () => json);
}

function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
