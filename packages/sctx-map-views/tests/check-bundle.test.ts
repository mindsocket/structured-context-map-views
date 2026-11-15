import { describe, expect, test } from 'bun:test';
import { importsStructuredContext } from '../scripts/check-bundle';

describe('importsStructuredContext', () => {
  test.each([
    'import { x } from "structured-context/api";',
    'import{x}from"structured-context/types";',
    'import "structured-context";',
    'const x = await import("structured-context/api");',
    "const x = require('structured-context');",
    'export * from "structured-context/browser";',
  ])('finds %s', (source) => {
    expect(importsStructuredContext(source)).toBe(true);
  });

  test.each([
    'import { x } from "structured-context-map-views";',
    'const note = "a structured-context schema";',
    'import { x } from "./structured-context.js";',
  ])('ignores %s', (source) => {
    expect(importsStructuredContext(source)).toBe(false);
  });
});
