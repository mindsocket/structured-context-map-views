import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadConfig, SpaceNotFoundError } from 'structured-context/api';
import { loadMapViewDefinitions } from 'structured-context-map-views/node';
import type { Plugin } from 'vite';
import { loadSpace } from './load-space';

/**
 * Dev-server middleware serving structured-context spaces and map view definitions to the
 * browser as JSON. Definitions are re-read on every request, so edits show on reload.
 */
export function sctxApi(): Plugin {
  return {
    name: 'structured-context-api',
    configureServer(server) {
      server.middlewares.use('/api/spaces', (req, res) => {
        handle(req, res).catch((err) => sendError(res, err));
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

async function handle(req: IncomingMessage, res: ServerResponse) {
  // Mounted at /api/spaces, so req.url is "/" or "/<space>", optionally with "?filter=<view or expression>".
  const url = new URL(req.url ?? '/', 'http://localhost');
  const spaceName = decodeURIComponent(url.pathname.slice(1));
  const filter = url.searchParams.get('filter') || undefined;
  const config = loadConfig();

  if (!spaceName) {
    sendJson(
      res,
      200,
      config.spaces.map((space) => ({ name: space.name })),
    );
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
