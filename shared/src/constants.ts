/** TJ-Cortex shared constants. */

export const APP_NAME = 'TJ-Cortex';
export const APP_ID = 'tj-cortex';
export const APP_VERSION = '0.1.0';
export const TAGLINE = 'Think. Connect. Build. Earn.';

export const WS_PATH = '/ws';
export const SIDECAR_DEFAULT_HOST = '127.0.0.1';
export const SIDECAR_DEFAULT_PORT = 47821;

/** Cortex Credit display peg. 1 CC = 1 USD for readability. Real fiat moves
 *  require user-configured payout keys and explicit consent. */
export const CC_PER_USD = 1;

/** Agent state colors. Kept in sync with branding/colors/tj-cortex-palette.json. */
export const STATE_COLORS = {
  working: '#F59E0B',   // Axon Amber
  idle: '#34D399',      // Dendrite Green
  meeting: '#3B82F6',   // Myelin Blue
  blocked: '#FB7185',   // Soma Rose
  sleeping: '#64748B',  // Glia Gray
  trading: '#14B8A6',   // Trade Teal
  earning: '#F59E0B',   // Revenue Gradient start
} as const;

export const LOCATION_IDS = [
  'node',
  'synapse_hall',
  'dendrite_diner',
  'soma_plaza',
  'axon_desk',
  'outbox',
  'trade_exchange',
  'guild_hall',
  'myelin_bank',
] as const;

export const LOCATION_BRAND: Record<(typeof LOCATION_IDS)[number], string> = {
  node: 'Node',
  synapse_hall: 'Synapse Hall',
  dendrite_diner: 'Dendrite Diner',
  soma_plaza: 'Soma Plaza',
  axon_desk: 'Axon Desk',
  outbox: 'OUTBOX',
  trade_exchange: 'Trade Exchange',
  guild_hall: 'Guild Hall',
  myelin_bank: 'Myelin Bank',
};

/** Default economic boundaries. */
export const ECON_DEFAULTS = {
  perAgentPerDayCC: 100,
  perContractCC: 25,
  allowExternalTransfers: false,
  requireConsentAboveCC: 10,
} as const;

/** Default Night Shift window (local time). */
export const NIGHT_SHIFT_DEFAULT = { start: '22:00', end: '06:00' } as const;

/** Google OAuth scopes for Gemini free tier via sign-in. */
export const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/generative-language.retriever',
] as const;

export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
export const GOOGLE_LOOPBACK_PORT_DEFAULT = 45289;