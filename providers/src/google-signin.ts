import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { URL } from 'node:url';
import {
  GOOGLE_AUTH_ENDPOINT,
  GOOGLE_LOOPBACK_PORT_DEFAULT,
  GOOGLE_OAUTH_SCOPES,
  GOOGLE_TOKEN_ENDPOINT,
  GOOGLE_USERINFO_ENDPOINT,
} from '@tj-cortex/shared';

/**
 * Google OAuth 2.0 with PKCE for a desktop app.
 *
 * Flow:
 *   1. Generate code_verifier + code_challenge (S256).
 *   2. Start a loopback HTTP server on 127.0.0.1:<port>.
 *   3. Open system browser to Google's consent screen.
 *   4. Receive code on /callback.
 *   5. Exchange code + verifier at Google's token endpoint.
 *   6. Return { accessToken, refreshToken, expiresAt, email }.
 *
 * The sidecar stores the refresh token in the OS keychain, never the UI.
 */

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // ms epoch
  email?: string;
  scope?: string;
}

export interface SignInOptions {
  clientId: string;
  clientSecret?: string; // desktop clients typically don't have one
  loopbackPort?: number;
  openBrowser: (url: string) => Promise<void>;
  timeoutMs?: number;
}

export async function googleSignIn(opts: SignInOptions): Promise<GoogleTokens> {
  const port = opts.loopbackPort ?? GOOGLE_LOOPBACK_PORT_DEFAULT;
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const codeVerifier = base64url(randomBytes(48));
  const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
  const state = randomUUID();

  const authUrl = new URL(GOOGLE_AUTH_ENDPOINT);
  authUrl.searchParams.set('client_id', opts.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GOOGLE_OAUTH_SCOPES.join(' '));
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('include_granted_scopes', 'true');

  const { code } = await new Promise<{ code: string }>((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? '/', redirectUri);
        if (url.pathname !== '/callback') {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        const returnedState = url.searchParams.get('state');
        const err = url.searchParams.get('error');
        if (err) {
          res.end(html(`Google sign-in error: ${escapeHtml(err)}. You can close this tab.`));
          reject(new Error(err));
          server.close();
          return;
        }
        if (returnedState !== state) {
          res.end(html('State mismatch. You can close this tab.'));
          reject(new Error('state_mismatch'));
          server.close();
          return;
        }
        const c = url.searchParams.get('code');
        if (!c) {
          res.end(html('Missing code. You can close this tab.'));
          reject(new Error('missing_code'));
          server.close();
          return;
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html('Signed in. You can close this tab and return to TJ-Cortex.'));
        resolve({ code: c });
        setTimeout(() => server.close(), 50);
      } catch (e) {
        reject(e);
        server.close();
      }
    });
    server.on('error', reject);
    server.listen(port, '127.0.0.1', async () => {
      try {
        await opts.openBrowser(authUrl.toString());
      } catch (e) {
        reject(e);
        server.close();
      }
    });
    if (opts.timeoutMs) {
      setTimeout(() => {
        reject(new Error('signin_timeout'));
        server.close();
      }, opts.timeoutMs).unref?.();
    }
  });

  const body = new URLSearchParams({
    client_id: opts.clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  if (opts.clientSecret) body.set('client_secret', opts.clientSecret);

  const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    throw new Error(`token_exchange_failed: ${tokenRes.status} ${t}`);
  }
  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };

  const expiresAt = Date.now() + tokenJson.expires_in * 1000 - 30_000;

  let email: string | undefined;
  try {
    const info = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (info.ok) {
      email = ((await info.json()) as { email?: string }).email;
    }
  } catch {
    // ignore
  }

  return {
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token,
    expiresAt,
    email,
    scope: tokenJson.scope,
  };
}

export async function refreshGoogleToken(
  clientId: string,
  refreshToken: string,
  clientSecret?: string,
): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  if (clientSecret) body.set('client_secret', clientSecret);

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`token_refresh_failed: ${res.status} ${t}`);
  }
  const j = (await res.json()) as { access_token: string; expires_in: number; scope?: string };
  return {
    accessToken: j.access_token,
    refreshToken,
    expiresAt: Date.now() + j.expires_in * 1000 - 30_000,
    scope: j.scope,
  };
}

function base64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function html(msg: string): string {
  return `<!doctype html><meta charset="utf-8"><title>TJ-Cortex</title>
<body style="font-family:Inter,system-ui;background:#0B0B14;color:#F8FAFC;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><div style="font-family:'Space Grotesk',Inter;font-size:32px;font-weight:700">TJ-CORTEX</div>
<div style="color:#22D3EE;letter-spacing:.3em;font-size:11px;margin-top:6px">THINK · CONNECT · BUILD · EARN</div>
<p style="margin-top:24px;color:#94A3B8">${msg}</p></div></body>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}