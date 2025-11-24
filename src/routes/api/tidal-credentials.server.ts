import { createServerFn } from '@tanstack/react-start'
// @ts-ignore: cloudflare:workers
import { env } from 'cloudflare:workers'
import { KVCredentialsProvider } from '../../server/credentialsProvider'

export const checkTidalCredentials = createServerFn()
  .inputValidator((input: { sessionId?: string }) => ({
    sessionId: input.sessionId,
  }))
  .handler(async ({ data }) => {
    const { sessionId } = data
    let credentialsProvider
    if (typeof env !== 'undefined' && env.SESSIONS_KV && sessionId) {
      credentialsProvider = new KVCredentialsProvider(
        env.SESSIONS_KV,
        sessionId,
      )
    } else {
      throw new Error('SESSIONS_KV binding or sessionId missing')
    }
    const creds = await credentialsProvider.getCredentials()
    return {
      isLoggedIn: !!creds?.access_token && !!creds?.user_id,
      token: creds?.access_token,
      userId: creds?.user_id,
      debug: creds,
    }
  })
