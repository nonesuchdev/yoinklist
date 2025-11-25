// spotify-utils.ts
// Abstraction for Spotify playlist and track info fetching

import fetch from 'node-fetch'

async function fetchSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify client ID or secret in environment')
  }
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  })
  const data = (await response.json()) as { access_token?: string }
  if (!data.access_token)
    throw new Error('Failed to fetch Spotify access token')
  return data.access_token
}

export async function getSpotifyPlaylistInfo(
  playlistId: string,
): Promise<{ name: string; tracks: Array<{ artist: string; title: string }> }> {
  // Fetch a Spotify access token using client credentials
  const accessToken = await fetchSpotifyAccessToken()
  let allTracks: Array<{ artist: string; title: string }> = []
  let url: string | null = `https://api.spotify.com/v1/playlists/${playlistId}`
  let playlistName = ''
  let isFirst = true
  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) {
      throw new Error(
        `Spotify API error: ${response.status} - ${response.statusText}`,
      )
    }
    const data: any = await response.json()
    if (data.error) {
      throw new Error(`Spotify API error: ${data.error.message}`)
    }
    if (isFirst) {
      // First response is the playlist overview
      type SpotifyPlaylistResponse = {
        name: string
        tracks?: {
          items: Array<{
            track: {
              artists: Array<{ name: string }>
              name: string
            }
          }>
          next: string | null
        }
        error?: { message: string }
      }
      const playlistData = data as SpotifyPlaylistResponse
      if (!playlistData.tracks) {
        throw new Error('Invalid playlist response: missing tracks data')
      }
      playlistName = playlistData.name
      const tracks = playlistData.tracks.items.map((item: any) => ({
        artist: item.track.artists[0].name,
        title: item.track.name,
      }))
      allTracks = allTracks.concat(tracks)
      url = playlistData.tracks.next
      isFirst = false
    } else {
      // Subsequent responses are tracks pages
      type SpotifyTracksResponse = {
        items: Array<{
          track: {
            artists: Array<{ name: string }>
            name: string
          }
        }>
        next: string | null
        error?: { message: string }
      }
      const tracksData = data as SpotifyTracksResponse
      if (tracksData.error) {
        throw new Error(`Spotify API error: ${tracksData.error.message}`)
      }
      const tracks = tracksData.items.map((item: any) => ({
        artist: item.track.artists[0].name,
        title: item.track.name,
      }))
      allTracks = allTracks.concat(tracks)
      url = tracksData.next
    }
  }
  return { name: playlistName, tracks: allTracks }
}

export async function getSpotifyTrackInfo(
  trackId: string,
): Promise<{ name: string; tracks: Array<{ artist: string; title: string }> }> {
  const accessToken = await fetchSpotifyAccessToken()
  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = (await response.json()) as {
    name: string
    artists: Array<{ name: string }>
  }
  return {
    name: data.name,
    tracks: [{ artist: data.artists[0].name, title: data.name }],
  }
}
