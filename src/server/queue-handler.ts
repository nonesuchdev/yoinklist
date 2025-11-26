// queue-handler.ts
import { addTracksToTidalPlaylist, searchTidalTrack } from './tidal-api-utils'

export interface QueueMessage {
  track: { artist: string; title: string }
  accessToken: string
  playlistId: string
}

export async function handleQueueMessage(batch: Array<QueueMessage>, env: any) {
  for (const message of batch) {
    try {
      const result = await searchTidalTrack(
        `${message.track.artist} ${message.track.title}`,
        message.accessToken,
      )
      if (result) {
        // Add to playlist
        await addTracksToTidalPlaylist(
          message.playlistId,
          [result.uri],
          message.accessToken,
        )
      }
    } catch (error) {
      console.error('Queue processing error:', error)
      // Could retry or log
    }
  }
}
