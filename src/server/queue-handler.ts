// queue-handler.ts
import { addTracksToTidalPlaylist, searchTidalTrack } from './tidal-api-utils'

export interface QueueMessage {
  tracks: Array<{ artist: string; title: string }>
  accessToken: string
  playlistId: string
  sessionId: string
}

export async function handleQueueMessage(batch: Array<any>, env: any) {
  for (const message of batch) {
    const data = message.body as QueueMessage
    const lastPollKey = `last_poll:${data.playlistId}`
    const lastPollStr = await env.SESSIONS_KV.get(lastPollKey)
    const lastPoll = lastPollStr ? parseInt(lastPollStr) : 0
    const now = Date.now()
    const timeoutMs = 10 * 60 * 1000 // 10 minutes

    if (now - lastPoll > timeoutMs) {
      console.log(
        `Skipping processing for playlist ${data.playlistId} due to inactivity (last poll: ${new Date(lastPoll).toISOString()})`,
      )
      continue
    }

    // Get current progress
    const progressKey = `progress:${data.playlistId}`
    const currentStr = await env.SESSIONS_KV.get(progressKey)
    let processedCount = parseInt(currentStr || '0')

    for (const track of data.tracks) {
      // Check again before each track in case polling stopped during processing
      const currentLastPollStr = await env.SESSIONS_KV.get(lastPollKey)
      const currentLastPoll = currentLastPollStr
        ? parseInt(currentLastPollStr)
        : 0
      if (now - currentLastPoll > timeoutMs) {
        console.log(
          `Stopping processing for playlist ${data.playlistId} due to inactivity during batch`,
        )
        break
      }

      const trackStart = Date.now()
      console.log('Processing track:', track)
      try {
        const searchStart = Date.now()
        const result = await searchTidalTrack(
          `${track.artist} ${track.title}`,
          data.accessToken,
        )
        console.log(`search track: ${Date.now() - searchStart}ms`)
        console.log('Search result:', result)
        if (result) {
          console.log('Adding track to playlist:', data.playlistId, result.uri)
          const addStart = Date.now()
          await addTracksToTidalPlaylist(
            data.playlistId,
            [result.uri],
            data.accessToken,
          )
          console.log(`add track: ${Date.now() - addStart}ms`)
          console.log('Track added successfully')
          processedCount++
          // Update progress in KV
          await env.SESSIONS_KV.put(
            `progress:${data.playlistId}`,
            processedCount.toString(),
          )
          console.log('Updated progress to:', processedCount)
        } else {
          console.log('Track not found, skipping')
        }
      } catch (error: any) {
        const isAuthError =
          error.message &&
          (error.message.includes('Expired token') ||
            error.message.includes('UNAUTHORIZED'))
        if (isAuthError) {
          console.log(
            `Skipping track due to auth error: ${track.artist} - ${track.title}`,
          )
        } else {
          console.error(
            `Error processing track ${track.artist} - ${track.title}:`,
            error,
          )
        }
        // Continue to next track or stop?
        // For now, continue, but perhaps break if auth error
        if (isAuthError) {
          console.log('Stopping batch due to auth error')
          break
        }
      }
      console.log(`process track: ${Date.now() - trackStart}ms`)
    }
  }
}
