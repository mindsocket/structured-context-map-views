import type { StructuredContextPlugin } from 'structured-context/api';
import { renderHtml } from './render';

const plugin: StructuredContextPlugin = {
  name: 'sctx-map-views',
  configSchema: { type: 'object', additionalProperties: false },
  render: {
    formats: [{ name: 'html', description: 'Self-contained interactive HTML page of the space and its map views' }],
    render: (context, _graph, { data }) => renderHtml(context, data),
  },
};

export default plugin;
