import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createTidalPlaylist } from '../server/tidal-api-utils'
import { KVCredentialsProvider } from '../server/credentialsProvider'
import {
  getSpotifyPlaylistInfo,
  getSpotifyTrackInfo,
} from '../server/spotify-utils'

interface Track {
  artist: string
  name: string
  cover?: string
}

interface ImportResult {
  playlistName: string
  numTracks: number
  numTracksSource: number
  preview: Track[]
  status: string
}

export const importSpotifyToTidal = createServerFn()
  .inputValidator((input: { spotifyUrl: string; sessionId: string }) => {
    if (
      typeof input.spotifyUrl !== 'string' ||
      typeof input.sessionId !== 'string'
    ) {
      throw new Error(
        'spotifyUrl and sessionId are required and must be strings',
      )
    }
    return {
      spotifyUrl: input.spotifyUrl,
      sessionId: input.sessionId,
    }
  })
  .handler(async ({ data }): Promise<ImportResult> => {
    try {
      const { spotifyUrl } = data
      let tracks: Array<{ artist: string; title: string }> = []
      let playlistTitle = ''

      // Parse Spotify URL
      const playlistMatch = spotifyUrl.match(/playlist\/([a-zA-Z0-9]+)/)
      const trackMatch = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/)
      if (!playlistMatch && !trackMatch) {
        throw new Error(
          'Invalid Spotify URL. Please provide a playlist or track URL.',
        )
      }

      // Fetch Spotify info
      if (playlistMatch) {
        const playlistId = playlistMatch[1]
        const info = await getSpotifyPlaylistInfo(playlistId)
        tracks = info.tracks
        playlistTitle = info.name
      } else if (trackMatch) {
        const trackId = trackMatch[1]
        const info = await getSpotifyTrackInfo(trackId)
        tracks = info.tracks
        playlistTitle = info.name
      }

      // Credentials provider for session
      const sessionId = data.sessionId
      if (!sessionId) {
        throw new Error('sessionId missing')
      }
      const credentialsProvider = new KVCredentialsProvider(
        env.SESSIONS_KV,
        sessionId,
      )
      const credentials = await credentialsProvider.getCredentials()
      const accessToken = credentials?.access_token
      if (!accessToken) {
        throw new Error('User is not authenticated with Tidal')
      }

      // Create Tidal playlist immediately
      const playlistId = await createTidalPlaylist(playlistTitle, accessToken)

      // Enqueue track searches for background processing
      const queue = env.yoink_import_queue
      for (const track of tracks) {
        await queue.send({
          track,
          accessToken,
          playlistId,
        })
      }

      return {
        playlistName: playlistTitle,
        numTracks: 0, // Will be added asynchronously
        numTracksSource: tracks.length,
        preview: tracks.slice(0, 5).map((track) => ({
          artist: track.artist,
          name: track.title,
          cover: '', // No cover available yet
        })),
        status: 'Processing in background. Check your Tidal account soon.',
      }
    } catch (error: any) {
      console.error('Import error:', error)
      throw new Error(error.message || 'Import failed')
    }
  })
