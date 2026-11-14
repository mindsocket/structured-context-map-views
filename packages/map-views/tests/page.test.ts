import { describe, expect, test } from 'bun:test';
import type { SpaceSnapshot } from '../src/core/snapshot';
import { fillPage, PAGE_SLOTS } from '../src/node/page';

const template = `<title>${PAGE_SLOTS.title}</title><script type="application/json" id="s">${PAGE_SLOTS.snapshots}</script>`;

const carried = (html: string) => JSON.parse(/id="s">(.*)<\/script>/s.exec(html)![1]!);

describe('fillPage', () => {
  test('writes the title and snapshots, escaped so data cannot close the script or title', () => {
    const snapshot = {
      space: 'a</script><!--',
      schemaId: undefined,
      graph: {},
      validation: { issues: [] },
      definitions: [],
    };
    const html = fillPage(template, [snapshot as unknown as SpaceSnapshot], '<b>Plan</b> & $&');
    expect(html).toContain('<title>&lt;b&gt;Plan&lt;/b&gt; &amp; $&amp;</title>');
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(carried(html)).toEqual([{ ...snapshot, schemaId: undefined }]);
  });

  test('rejects a template without each slot exactly once', () => {
    expect(() => fillPage('<title></title>', [], 'x')).toThrow(PAGE_SLOTS.title);
  });
});
