// DRY Tidal API fetch helper
async function tidalFetch(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  accessToken?: string,
) {
  const baseUrl =
    process.env.TIDAL_API_BASE_URL || 'https://openapi.tidal.com/v2'
  const url = `${baseUrl}${endpoint}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
  const options: RequestInit = {
    method,
    headers,
  }
  if (body) options.body = JSON.stringify(body)

  const res = await fetch(url, options)
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Tidal API error: ${res.status} ${error}`)
  }
  // let result
  // try {
  //   result = await res.clone().json()
  // } catch {
  //   result = 'Failed to parse JSON'
  // }
  // console.log(`[tidalFetch] - Result`, result)
  try {
    return await res.json()
  } catch {
    return null
  }
}

// Search for a track on Tidal (v2)
export async function searchTidalTrack(
  query: string,
  accessToken: string,
): Promise<{ uri: string; cover?: string } | null> {
  const params = new URLSearchParams({
    countryCode: 'US',
    include: 'tracks,albums',
  }).toString()
  const data = await tidalFetch(
    `/searchResults/${encodeURIComponent(query)}?${params}`,
    'GET',
    undefined,
    accessToken,
  )
  if (data?.data?.relationships?.tracks?.data?.length > 0) {
    const track = data.data.relationships.tracks.data[0]
    return {
      uri: `tidal:track:${track.id}`,
      cover: track.relationships?.album?.data?.attributes?.cover || '',
    }
  }
  return null
}

// Create a new playlist on Tidal (v2)
export async function createTidalPlaylist(
  title: string,
  accessToken: string,
): Promise<string> {
  const body = {
    data: {
      type: 'playlists',
      attributes: {
        name: title,
        privacy: 'private',
      },
    },
  }
  const data = await tidalFetch('/playlists', 'POST', body, accessToken)
  return data.data.id
}

// Add tracks to a playlist on Tidal (v2)
export async function addTracksToTidalPlaylist(
  playlistId: string,
  uris: Array<string>,
  accessToken: string,
): Promise<void> {
  const trackData = uris.map((uri) => {
    const id = uri.split(':')[2]
    return {
      type: 'tracks',
      id,
      meta: { addedAt: new Date().toISOString() },
    }
  })
  const body = { data: trackData }
  await tidalFetch(
    `/playlists/${playlistId}/relationships/items`,
    'POST',
    body,
    accessToken,
  )
}
