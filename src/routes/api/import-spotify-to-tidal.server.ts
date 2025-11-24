import { createServerFn } from '@tanstack/react-start'
// @ts-ignore: cloudflare:workers
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
  .inputValidator(() => ({
    spotifyUrl:
      'https://open.spotify.com/playlist/3BJFjPrYay5hCimKsdgqUM?si=eHGGrf9QQ-ae-d-k8rb7Ig&pi=7ozYdiExS2W_T',
    sessionId: '', // Must be set by client/session
  }))
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

    // Automated credentials provider selection for local/Workers
    const sessionId = data.sessionId
    let credentialsProvider
    console.log('[importSpotifyToTidal] sessionId:', JSON.stringify(sessionId))
    if (typeof env !== 'undefined' && env.SESSIONS_KV && sessionId) {
      console.log(
        '[importSpotifyToTidal] Using KVCredentialsProvider for session:',
        JSON.stringify(sessionId),
      )
      credentialsProvider = new KVCredentialsProvider(
        env.SESSIONS_KV,
        sessionId,
      )
    } else {
      throw new Error('SESSIONS_KV binding or sessionId missing')
    }
    console.log(
      '[importSpotifyToTidal] Getting credentials for session:',
      JSON.stringify(sessionId),
    )
    const credentials = await credentialsProvider.getCredentials()
    console.log(
      '[importSpotifyToTidal] Got credentials:',
      JSON.stringify(credentials),
    )
    const accessToken = credentials?.token
    if (!accessToken) {
      console.error(
        '[importSpotifyToTidal] No access token found for session:',
        sessionId,
      )
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

    const result = {
      playlistName: playlistTitle,
      numTracks: tidalTracks.length,
      numTracksSource: tracks.length,
      preview: preview.slice(0, 5),
    }
    // Clean log: server return value
    console.log(
      '[importSpotifyToTidal] Returning:',
      JSON.stringify(result, null, 2),
    )
    return result
  })
