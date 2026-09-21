/** WebSocket event names between sidecar and UI/village. */

export const WS_EVENTS = {
  // Connection
  Hello: 'hello',
  Ping: 'ping',
  Pong: 'pong',

  // Agents
  AgentCreated: 'agent.created',
  AgentUpdated: 'agent.updated',
  AgentDeleted: 'agent.deleted',
  AgentStateChanged: 'agent.state',

  // Messages / transcripts
  MessageAdded: 'message.added',
  ReasoningDelta: 'reasoning.delta',
  StreamDelta: 'stream.delta',
  StreamEnd: 'stream.end',

  // Tools / permissions
  ToolCallRequested: 'tool.call.requested',
  ToolCallResolved: 'tool.call.resolved',
  PermissionRequested: 'permission.requested',
  PermissionResolved: 'permission.resolved',

  // Village
  VillagePositionUpdate: 'village.position',
  VillageTime: 'village.time',
  VillageWeather: 'village.weather',

  // Economy
  LedgerEntry: 'ledger.entry',
  WalletUpdated: 'wallet.updated',
  ContractProposed: 'contract.proposed',
  ContractSigned: 'contract.signed',
  ContractSettled: 'contract.settled',
  BountyPosted: 'bounty.posted',
  BountyClaimed: 'bounty.claimed',
  BountyPaid: 'bounty.paid',
  ReputationUpdated: 'reputation.updated',
  GuildUpdated: 'guild.updated',

  // Providers / cost
  ProviderStatus: 'provider.status',
  CostUpdated: 'cost.updated',

  // System
  NightShiftStart: 'nightshift.start',
  NightShiftEnd: 'nightshift.end',
  OutboxUpdated: 'outbox.updated',
  Error: 'error',
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

export interface WsEnvelope<T = unknown> {
  event: WsEventName;
  ts: number;
  payload: T;
}