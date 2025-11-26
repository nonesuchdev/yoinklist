import { createServerFn } from '@tanstack/react-start'
// @ts-ignore: cloudflare:workers
import { env } from 'cloudflare:workers'
import { KVCredentialsProvider } from '../server/credentialsProvider'

export const checkTidalCredentials = createServerFn()
  .inputValidator((input: { sessionId?: string }) => ({
    sessionId: input.sessionId,
  }))
  .handler(async ({ data }) => {
    const { sessionId } = data
    if (!sessionId) {
      throw new Error('sessionId missing')
    }
    const credentialsProvider = new KVCredentialsProvider(
      env.SESSIONS_KV,
      sessionId,
    )
    const creds = await credentialsProvider.getCredentials()
    return {
      isLoggedIn: !!creds?.access_token && !!creds?.user_id,
      token: creds?.access_token,
      userId: creds?.user_id,
    }
  })
