import { createServerFn } from '@tanstack/react-start'
// @ts-ignore: cloudflare:workers
import { env } from 'cloudflare:workers'
import { KVCredentialsProvider } from '../../server/credentialsProvider'

const {
  TIDAL_CLIENT_ID: clientId = 'client-id-missing',
  TIDAL_CLIENT_SECRET: clientSecret = 'client-secret-missing',
} = env

export const tidalFinalizeLogin = createServerFn()
  .inputValidator(
    (input: {
      queryString: string
      codeVerifier?: string
      redirectUri?: string
      sessionId?: string
    }) => input,
  )
  .handler(async ({ data }) => {
    const queryString = data.queryString
    const codeVerifier = data.codeVerifier || ''
    const redirectUri = data.redirectUri || ''
    const sessionId = data.sessionId || ''
    // Parse code from queryString
    const params = new URLSearchParams(queryString)
    const code = params.get('code')
    if (!code) throw new Error('No code found in query string')
    // Exchange code for token using PKCE
    const { exchangeTidalCodeForToken } = await import(
      '../../server/tidal-oauth-utils'
    )
    const tokenResponse = await exchangeTidalCodeForToken({
      clientId,
      clientSecret,
      code,
      redirectUri,
      codeVerifier,
    })
    // Automated credentials provider selection for local/Workers
    let credentialsProvider
    if (sessionId) {
      credentialsProvider = new KVCredentialsProvider(
        env.SESSIONS_KV,
        sessionId,
      )
      await credentialsProvider.setCredentials(tokenResponse)
      return { success: true }
    } else {
      throw new Error('sessionId missing')
    }
  })
