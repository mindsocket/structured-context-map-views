import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const srcDir = join(import.meta.dir, '../src');

function importsIn(dir: string): { file: string; specifier: string }[] {
  return readdirSync(join(srcDir, dir), { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f))
    .flatMap((f) => {
      const source = readFileSync(join(srcDir, dir, f), 'utf8');
      return [...source.matchAll(/(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/g)].map((m) => ({
        file: join(dir, f),
        specifier: m[1]!,
      }));
    });
}

describe('module boundaries', () => {
  test('map-views/core has no React, DOM-host, Node or runtime structured-context dependencies and no upward imports', () => {
    const forbidden = /^(react|react-dom)(\/|$)|^node:|^structured-context(\/|$)|^(\.\.\/)+(layouts|navigator)(\/|$)/;
    const violations = importsIn('map-views/core').filter(
      ({ file, specifier }) =>
        forbidden.test(specifier) && !(specifier.startsWith('structured-context') && isTypeOnly(file, specifier)),
    );
    expect(violations).toEqual([]);
  });

  test('map-views/layouts does not import from host shells', () => {
    expect(importsIn('map-views/layouts').filter(({ specifier }) => /\/navigator/.test(specifier))).toEqual([]);
  });
});

/** `import type` is erased at build time, so it is browser-safe. */
function isTypeOnly(file: string, specifier: string): boolean {
  const source = readFileSync(join(srcDir, file), 'utf8');
  const statements = source.match(new RegExp(`(?:import|export)[^;]*from\\s+['"]${specifier}['"]`, 'g')) ?? [];
  return statements.every((s) => /^(import|export)\s+type\b/.test(s));
}
