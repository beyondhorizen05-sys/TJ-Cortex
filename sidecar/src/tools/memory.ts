import { registerTool } from './registry.js';
import { remember, recall } from '../memory.js';

registerTool({
  descriptor: {
    name: 'memory.remember',
    category: 'memory',
    description: 'Store a durable memory for this agent.',
    risk: 'write',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['episodic', 'semantic', 'procedural', 'social', 'economic'] },
        key: { type: 'string' },
        value: { type: 'string' },
        importance: { type: 'number' },
      },
      required: ['kind', 'key', 'value'],
    },
    requiresConsent: false,
    scoped: true,
    enabled: true,
  },
  async run(inv) {
    return remember({
      agentId: inv.agentId,
      kind: String(inv.args.kind) as any,
      key: String(inv.args.key),
      value: String(inv.args.value),
      importance: typeof inv.args.importance === 'number' ? inv.args.importance : undefined,
    });
  },
});

registerTool({
  descriptor: {
    name: 'memory.recall',
    category: 'memory',
    description: 'Recall memories relevant to a topic.',
    risk: 'read',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        kind: { type: 'string' },
        limit: { type: 'number' },
      },
    },
    requiresConsent: false,
    scoped: true,
    enabled: true,
  },
  async run(inv) {
    return recall({
      agentId: inv.agentId,
      kind: inv.args.kind as any,
      text: inv.args.text ? String(inv.args.text) : undefined,
      limit: typeof inv.args.limit === 'number' ? inv.args.limit : 12,
    });
  },
});