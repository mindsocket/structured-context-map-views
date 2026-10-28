import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { OUTPUT, render } from '../scripts/generate-definitions';

test('the embedded bundled definitions are up to date (bun run generate:definitions)', () => {
  expect(readFileSync(OUTPUT, 'utf8')).toBe(render());
});
