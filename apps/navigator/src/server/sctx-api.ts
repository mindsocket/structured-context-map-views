import { readdirSync, readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { basename, join, resolve } from 'node:path';
import { loadConfig, SpaceNotFoundError } from 'structured-context/api';
import { loadMapViewDefinitions } from 'structured-context-map-views/node';
import type { Plugin } from 'vite';
import { loadSpace } from './load-space';

/**
 * Dev-server middleware serving structured-context spaces and map view definitions to the
 * browser as JSON. Definitions are re-read on every request, so edits show on reload.
 *
 * The test fixtures are listed too, as `fixture:<name>`, so map views can be checked against
 * known data when a live space doesn't load.
 */
export function sctxApi(): Plugin {
  return {
    name: 'structured-context-api',
    configureServer(server) {
      const fixturesDir = resolve(server.config.root, FIXTURES_DIR);
      server.middlewares.use('/api/spaces', (req, res) => {
        handle(req, res, fixturesDir).catch((err) => sendError(res, err));
      });
      server.middlewares.use('/api/map-views', (_req, res) => {
        try {
          sendJson(res, 200, loadMapViewDefinitions(loadConfig()));
        } catch (err) {
          sendError(res, err);
        }
      });
    },
  };
}

const FIXTURE = 'fixture:';
/** The library's captured spaces, relative to the app. */
const FIXTURES_DIR = '../../packages/map-views/tests/fixtures';

async function handle(req: IncomingMessage, res: ServerResponse, fixturesDir: string) {
  // Mounted at /api/spaces, so req.url is "/" or "/<space>", optionally with "?filter=<view or expression>".
  const url = new URL(req.url ?? '/', 'http://localhost');
  const spaceName = decodeURIComponent(url.pathname.slice(1));
  const filter = url.searchParams.get('filter') || undefined;
  const config = loadConfig();

  if (!spaceName) {
    sendJson(res, 200, [
      ...config.spaces.map((space) => ({ name: space.name })),
      ...readdirSync(fixturesDir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => ({ name: `${FIXTURE}${basename(file, '.json')}` })),
    ]);
    return;
  }

  if (spaceName.startsWith(FIXTURE)) {
    if (filter) {
      sendJson(res, 400, { error: 'Filters need a live space: fixtures have no space config to evaluate them with.' });
      return;
    }
    const name = basename(spaceName.slice(FIXTURE.length));
    sendJson(res, 200, JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), 'utf8')));
    return;
  }

  try {
    const data = await loadSpace(spaceName, config, filter);
    sendJson(res, 200, data);
  } catch (err) {
    if (err instanceof SpaceNotFoundError) {
      sendJson(res, 404, { error: err.message });
      return;
    }
    throw err;
  }
}

function sendError(res: ServerResponse, err: unknown) {
  sendJson(res, 500, { error: String(err instanceof Error ? err.message : err) });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}
