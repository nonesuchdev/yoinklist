import { createServerFn } from '@tanstack/react-start'
// @ts-ignore: cloudflare:workers
import { env } from 'cloudflare:workers'
import { KVCredentialsProvider } from '../../server/credentialsProvider'

export const tidalLogoutServer = createServerFn()
  .inputValidator((input: { sessionId?: string }) => ({
    sessionId: input.sessionId,
  }))
  .handler(async ({ data }) => {
    const sessionId = data.sessionId
    if (!sessionId) {
      throw new Error('sessionId missing')
    }
    const credentialsProvider = new KVCredentialsProvider(
      env.SESSIONS_KV,
      sessionId,
    )
    await credentialsProvider.removeCredentials()
    return { success: true }
  })
