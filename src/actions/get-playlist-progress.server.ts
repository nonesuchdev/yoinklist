import { createServerFn } from '@tanstack/react-start'
// @ts-ignore: cloudflare:workers
import { env } from 'cloudflare:workers'

export const getPlaylistProgress = createServerFn()
  .inputValidator((input: { sessionId: string; playlistId: string }) => ({
    sessionId: typeof input.sessionId === 'string' ? input.sessionId : '',
    playlistId: typeof input.playlistId === 'string' ? input.playlistId : '',
  }))
  .handler(async ({ data }) => {
    const sessionId = data.sessionId
    const playlistId = data.playlistId
    if (!sessionId || !playlistId) {
      throw new Error('sessionId and playlistId are required')
    }
    const progressKey = `progress:${playlistId}`
    const totalKey = `total:${playlistId}`
    const currentStr = await env.SESSIONS_KV.get(progressKey)
    const totalStr = await env.SESSIONS_KV.get(totalKey)
    const current = parseInt(currentStr || '0')
    const total = parseInt(totalStr || '0')
    console.log(`Progress from KV: ${current}/${total}`)
    return { current, total }
  })
