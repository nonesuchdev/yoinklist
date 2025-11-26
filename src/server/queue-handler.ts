// queue-handler.ts
import { addTracksToTidalPlaylist, searchTidalTrack } from './tidal-api-utils'

export interface QueueMessage {
  track: { artist: string; title: string }
  accessToken: string
  playlistId: string
}

export async function handleQueueMessage(batch: Array<any>, env: any) {
  for (const message of batch) {
    const data = message.body as QueueMessage
    try {
      const result = await searchTidalTrack(
        `${data.track.artist} ${data.track.title}`,
        data.accessToken,
      )
      if (result) {
        // Add to playlist
        await addTracksToTidalPlaylist(
          data.playlistId,
          [result.uri],
          data.accessToken,
        )
      }
    } catch (error) {
      console.error('Queue processing error:', error)
      // Could retry or log
    }
  }
}
