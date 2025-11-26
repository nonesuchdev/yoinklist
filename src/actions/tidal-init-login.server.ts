import { createServerFn } from '@tanstack/react-start'
// @ts-ignore: cloudflare:workers
import { env } from 'cloudflare:workers'
import { getTidalAuthUrl } from '../server/tidal-oauth-utils'

const { TIDAL_CLIENT_ID: clientId = 'client-id-missing' } = env

export const tidalInitLogin = createServerFn()
  .inputValidator(
    (input: {
      redirectUri: string
      codeChallenge?: string
      codeChallengeMethod?: string
    }) => input,
  )
  .handler(async ({ data }) => {
    // Use redirectUri exactly as provided
    const redirectUri = data.redirectUri
    const scopes = ['user.read', 'playlists.write']
    const codeChallenge = data.codeChallenge
    const codeChallengeMethod = data.codeChallengeMethod || 'S256'
    const authUrl = await getTidalAuthUrl({
      clientId,
      redirectUri,
      scopes,
      codeChallenge,
      codeChallengeMethod,
    })
    return { authUrl }
  })
