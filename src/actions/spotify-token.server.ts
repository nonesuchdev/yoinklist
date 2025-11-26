import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'

export const getSpotifyToken = createServerFn().handler(async () => {
  const clientId = env.SPOTIFY_CLIENT_ID
  const clientSecret = env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials')
  }
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  })
  const data = await response.json()
  if (!response.ok || !data.access_token) {
    throw new Error(data.error || 'Failed to fetch Spotify access token')
  }
  return { access_token: data.access_token }
})
