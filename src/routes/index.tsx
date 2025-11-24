import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertCircle, LoaderPinwheel, LogIn, LogOut } from 'lucide-react'
import { useServerFn } from '@tanstack/react-start'
import { getOrCreateSessionId } from '../lib/sessionId'
import {
  checkTidalCredentials,
  importSpotifyToTidal,
  tidalFinalizeLogin,
  tidalInitLogin,
  tidalLogoutServer,
} from './api'

function Home() {
  const [spotifyUrl, setSpotifyUrl] = useState<string>(
    'https://open.spotify.com/playlist/3BJFjPrYay5hCimKsdgqUM?si=eHGGrf9QQ-ae-d-k8rb7Ig&pi=7ozYdiExS2W_T',
  )
  const [importedTracks, setImportedTracks] = useState<
    Array<{ name: string; cover: string }>
  >([])
  const [playlistTitle, setPlaylistTitle] = useState<string>('')
  const [copiedCount, setCopiedCount] = useState<number>(0)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [importLoading, setImportLoading] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const checkCredentials = useServerFn(checkTidalCredentials)
  const initLoginFn = useServerFn(tidalInitLogin)
  const finalizeLoginFn = useServerFn(tidalFinalizeLogin)
  const logoutServerFn = useServerFn(tidalLogoutServer)
  const importSpotifyToTidalFn = useServerFn(importSpotifyToTidal)

  useEffect(() => {
    setLoading(true)
    const sessionId = getOrCreateSessionId()
    checkCredentials({ data: { sessionId } })
      .then((result) => {
        setIsLoggedIn(result.isLoggedIn)
        setSuccess(!!result.isLoggedIn)
      })
      .catch(() => setError('Failed to check Tidal credentials'))
      .finally(() => setLoading(false))
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const codeVerifier = [...crypto.getRandomValues(new Uint8Array(32))]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      const encoder = new TextEncoder()
      const data = encoder.encode(codeVerifier)
      const digest = await window.crypto.subtle.digest('SHA-256', data)
      const base64url = (arrayBuffer: ArrayBuffer) => {
        return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')
      }
      const codeChallenge = base64url(digest)
      sessionStorage.setItem('tidal_pkce_verifier', codeVerifier)
      sessionStorage.setItem(
        'tidal_pkce_redirect_uri',
        window.location.origin + window.location.pathname,
      )
      const { authUrl } = await initLoginFn({
        data: {
          redirectUri: window.location.origin + window.location.pathname,
          codeChallenge,
          codeChallengeMethod: 'S256',
        },
      })
      window.location.href = authUrl
    } catch (err) {
      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    if (code) {
      setLoading(true)
      const codeVerifier = sessionStorage.getItem('tidal_pkce_verifier') || ''
      const redirectUri =
        sessionStorage.getItem('tidal_pkce_redirect_uri') ||
        window.location.origin + window.location.pathname
      const sessionId = getOrCreateSessionId()
      finalizeLoginFn({
        data: {
          queryString: window.location.search.slice(1),
          codeVerifier,
          redirectUri,
          sessionId,
        },
      })
        .then(() => {
          setIsLoggedIn(true)
          setSuccess(true)
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          )
        })
        .catch(() => setError('Finalize login failed'))
        .finally(() => setLoading(false))
    }
  }, [])

  // Removed invalid useEffect block

  const handleCreatePlaylist = async () => {
    setImportLoading(true)
    setError(null)
    try {
      if (!spotifyUrl) {
        alert('Please provide a Spotify playlist or track URL.')
        setImportLoading(false)
        return
      }
      const sessionId = getOrCreateSessionId()
      const result = await importSpotifyToTidalFn({
        data: { spotifyUrl, sessionId },
      })
      setImportedTracks(
        result.preview.map((t) => ({
          name: `${t.artist} - ${t.name}`,
          cover: t.cover || '',
        })),
      )
      setPlaylistTitle(result.playlistName)
      setCopiedCount(result.numTracks)
      setTotalCount(result.numTracksSource)
      setSuccess(true)
    } catch (err) {
      setError('Failed to create playlist')
    } finally {
      setImportLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    setError(null)
    try {
      await logoutServerFn({ data: { sessionId: getOrCreateSessionId() } })
      setIsLoggedIn(false)
      setSuccess(false)
    } catch (err) {
      setError('Logout failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#282c34] text-white px-4">
      <h1 className="text-2xl mb-8 flex flex-col items-center">
        YoinkList
        <span className="text-sm text-gray-400">
          Copy Spotify playlists to Tidal
        </span>
      </h1>
      {!isLoggedIn ? (
        <button
          onClick={handleLogin}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
          type="button"
          disabled={loading}
        >
          {loading ? (
            <>
              <LoaderPinwheel className="animate-spin w-5 h-5 mr-2" /> Loading
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" /> Login to Tidal
            </>
          )}
        </button>
      ) : (
        <div className="text-center">
          <input
            type="text"
            placeholder="Enter Spotify playlist or track URL"
            value={spotifyUrl}
            onChange={(e) => setSpotifyUrl(e.target.value)}
            className="mb-4 px-4 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 w-96"
          />
          <br />
          <button
            onClick={handleCreatePlaylist}
            disabled={importLoading}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-sm text-md mr-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importLoading ? 'Importing...' : 'Import Playlist'}
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-sm text-md flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
          {success && importedTracks.length > 0 && (
            <div className="mt-8">
              <div className="text-white mb-4">
                <div className="text-xl font-bold">
                  Created "{playlistTitle.trim()}"
                </div>
                {copiedCount < totalCount ? (
                  <div>
                    Copied {copiedCount} out of {totalCount}, some tracks may
                    not be available on Tidal.
                  </div>
                ) : (
                  <div>All {totalCount} tracks copied successfully!</div>
                )}
              </div>
              <div className="bg-gray-800 p-4 rounded-lg max-w-md mx-auto">
                {importedTracks.map((track, index) => {
                  const [artist, title] = track.name.split(' - ')
                  return (
                    <div
                      key={index}
                      className="flex items-center mb-2 last:mb-0"
                    >
                      {track.cover && (
                        <img
                          src={track.cover}
                          alt="Album cover"
                          className="w-12 h-12 rounded mr-3"
                        />
                      )}
                      <div className="text-left">
                        <div className="text-white font-semibold">{title}</div>
                        <div className="text-gray-400 text-sm">{artist}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="mt-4 text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  )
}

export const Route = createFileRoute('/')({
  component: Home,
})
