// src/server/tidal-oauth-utils.ts
// Cloudflare Workers-compatible Tidal OAuth helpers

// Server-side Tidal OAuth helpers using .env values
const clientId = process.env.TIDAL_CLIENT_ID
const clientSecret = process.env.TIDAL_CLIENT_SECRET
const redirectUri =
  process.env.TIDAL_REDIRECT_URI || 'http://localhost:3000/api/tidal-callback'

// Get Tidal OAuth URL for user login (uses .env values)
export function getServerTidalAuthUrl(
  scopes: Array<string> = ['user.read', 'playlists.write'],
) {
  const baseUrl = 'https://login.tidal.com/authorize'
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId!,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
  })
  return `${baseUrl}?${params.toString()}`
}

// Exchange code for access token (uses .env values)
export async function serverExchangeTidalCodeForToken(code: string) {
  const tokenUrl = 'https://login.tidal.com/oauth2/token'
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId!,
    client_secret: clientSecret!,
    redirect_uri: redirectUri,
  })
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok)
    throw new Error(
      `Tidal token exchange failed: ${res.status} ${await res.text()}`,
    )
  return await res.json() // { access_token, refresh_token, ... }
}

export async function getTidalAuthUrl({
  clientId,
  redirectUri,
  scopes,
  codeChallenge,
  codeChallengeMethod,
}: {
  clientId: string
  redirectUri: string
  scopes: Array<string>
  codeChallenge?: string
  codeChallengeMethod?: string
}): Promise<string> {
  const baseUrl = 'https://login.tidal.com/authorize'
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
  })
  if (codeChallenge) {
    params.set('code_challenge', codeChallenge)
    params.set('code_challenge_method', codeChallengeMethod || 'S256')
  }
  return `${baseUrl}?${params.toString()}`
}

export async function exchangeTidalCodeForToken({
  clientId,
  clientSecret,
  code,
  redirectUri,
  codeVerifier,
}: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
  codeVerifier?: string
}): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const tokenUrl = 'https://login.tidal.com/oauth2/token'
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  })
  if (codeVerifier) {
    body.set('code_verifier', codeVerifier)
  }
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) {
    throw new Error(
      `Tidal token exchange failed: ${res.status} ${await res.text()}`,
    )
  }
  return await res.json()
}
