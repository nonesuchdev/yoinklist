import { createServerFn } from '@tanstack/react-start'
// @ts-ignore: cloudflare:workers
import { env } from 'cloudflare:workers'
import { KVCredentialsProvider } from '../../server/credentialsProvider'

export const checkTidalCredentials = createServerFn()
  .inputValidator((input: { sessionId?: string }) => {
    return {
      sessionId: typeof input.sessionId === 'string' ? input.sessionId : '',
    }
  })
  .handler(async ({ data }) => {
    console.log('[tidal-credentials] Handler called', data)
    const { sessionId } = data
    let credentialsProvider
    console.debug(
      '[tidal-credentials] Handler called, sessionId:',
      JSON.stringify(sessionId),
    )
    if (typeof env !== 'undefined' && env.SESSIONS_KV && sessionId) {
      console.debug(
        '[tidal-credentials] Using KVCredentialsProvider for session:',
        JSON.stringify(sessionId),
      )
      credentialsProvider = new KVCredentialsProvider(
        env.SESSIONS_KV,
        sessionId,
      )
    } else {
      throw new Error('SESSIONS_KV binding or sessionId missing')
    }
    try {
      const creds = await credentialsProvider.getCredentials()
      console.debug('[tidal-credentials] Got credentials:', creds)
      return {
        isLoggedIn: !!creds?.access_token && !!creds?.user_id,
        token: creds?.access_token,
        userId: creds?.user_id,
        debug: creds,
      }
    } catch (err) {
      console.error('[tidal-credentials] Error in handler:', err)
      throw err
    }
  })
