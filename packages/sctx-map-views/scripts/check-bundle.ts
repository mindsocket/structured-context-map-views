/** Fails when the plugin bundle imports structured-context, which core passes through the render callbacks instead. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const IMPORT = /\b(?:from|import|require)\s*\(?\s*["']structured-context(?:["'/])/;

export const importsStructuredContext = (source: string): boolean => IMPORT.test(source);

if (import.meta.main) {
  const bundle = join(import.meta.dir, '..', 'dist/index.js');
  if (importsStructuredContext(readFileSync(bundle, 'utf8'))) {
    console.error('The bundle imports structured-context.');
    process.exit(1);
  }
}
