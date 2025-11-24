import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import {
  addTracksToTidalPlaylist,
  createTidalPlaylist,
  searchTidalTrack,
} from '../../server/tidal-api-utils'
import { KVCredentialsProvider } from '../../server/credentialsProvider'
import {
  getSpotifyPlaylistInfo,
  getSpotifyTrackInfo,
} from '../../server/spotify-utils'

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
  .handler(async ({ data }) => {
    const { spotifyUrl } = data
    let tracks: Array<{ artist: string; title: string }> = []
    let playlistTitle = ''
    const preview: Array<{ name: string; artist: string; cover?: string }> = []

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

    // Search for each track on Tidal
    const tidalTracks: Array<string> = []
    for (const track of tracks) {
      const tidalResult = await searchTidalTrack(
        `${track.artist} ${track.title}`,
        accessToken,
      )
      if (tidalResult) {
        tidalTracks.push(tidalResult.uri)
        preview.push({
          name: track.title,
          artist: track.artist,
          cover: tidalResult.cover || '',
        })
      }
    }

    // Create playlist on Tidal
    const playlistId = await createTidalPlaylist(playlistTitle, accessToken)
    await addTracksToTidalPlaylist(playlistId, tidalTracks, accessToken)

    return {
      playlistName: playlistTitle,
      numTracks: tidalTracks.length,
      numTracksSource: tracks.length,
      preview: preview.slice(0, 5),
    }
  })
