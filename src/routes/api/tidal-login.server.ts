import { createServerFn } from '@tanstack/react-start'
// @ts-ignore: cloudflare:workers
import { env } from 'cloudflare:workers'
import { KVCredentialsProvider } from '../../server/credentialsProvider'
import { serverExchangeTidalCodeForToken } from '../../server/tidal-oauth-utils'

export const tidalLoginServer = createServerFn()
  .inputValidator((input: { sessionId: string; code: string }) => ({
    sessionId: typeof input.sessionId === 'string' ? input.sessionId : '',
    code: typeof input.code === 'string' ? input.code : '',
  }))
  .handler(async ({ data }) => {
    const sessionId = data.sessionId
    const code = data.code // code should be passed from client after redirect
    if (!env?.SESSIONS_KV || !sessionId || !code) {
      throw new Error('SESSIONS_KV binding, sessionId, or code missing')
    }
    const credentialsProvider = new KVCredentialsProvider(
      env.SESSIONS_KV,
      sessionId,
    )
    const credentials = await serverExchangeTidalCodeForToken(code)
    console.log(
      '[tidal-login] Received credentials:',
      JSON.stringify(credentials, null, 2),
    )
    await credentialsProvider.setCredentials(credentials)
    console.log('[tidal-login] Stored credentials for session:', sessionId)
    return {
      success: true,
      token: credentials.access_token,
      userId: credentials.user_id,
      debug: {
        stored: true,
        credentials: credentials,
      },
    }
  })
