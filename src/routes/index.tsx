import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Download,
  LoaderPinwheel,
  LogIn,
  LogOut,
} from 'lucide-react'
import { useServerFn } from '@tanstack/react-start'
import { getOrCreateSessionId } from '../lib/sessionId'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent } from '../components/ui/card'
import {
  checkTidalCredentials,
  importSpotifyToTidal,
  tidalFinalizeLogin,
  tidalInitLogin,
  tidalLogoutServer,
} from './api'

function Home() {
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
  const inputRef = useRef<HTMLInputElement>(null)
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
      const url = inputRef.current ? inputRef.current.value.trim() : ''
      if (!url) {
        alert('Please provide a Spotify playlist or track URL.')
        setImportLoading(false)
        return
      }
      let processedUrl = url
      if (processedUrl.startsWith('open.spotify.com')) {
        processedUrl = 'https://' + processedUrl
      }
      if (!processedUrl.startsWith('https://open.spotify.com/')) {
        alert('Invalid Spotify URL. Please provide a valid Spotify URL.')
        setImportLoading(false)
        return
      }
      const sessionId = getOrCreateSessionId()
      const result = await importSpotifyToTidalFn({
        data: { spotifyUrl: processedUrl, sessionId },
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
      <h1 className="text-4xl mb-12 flex flex-col items-center">
        YoinkList
        <span className="text-sm text-gray-400">
          Copy Spotify playlists to Tidal
        </span>
      </h1>
      {!isLoggedIn ? (
        <Button
          onClick={handleLogin}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg flex items-center gap-2 min-w-[180px]"
          disabled={loading}
        >
          {loading ? (
            <>
              <LoaderPinwheel className="animate-spin w-5 h-5" /> Loading
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" /> Login to Tidal
            </>
          )}
        </Button>
      ) : (
        <Card className="w-full max-w-md bg-gray-800 text-white border-gray-700">
          <CardContent className="pt-6 px-8">
            <label className="block mb-2 text-lg font-medium">
              Link to Spotify Playlist
            </label>
            <Input
              ref={inputRef}
              placeholder="Enter Spotify playlist or track URL"
            />
            <div className="flex gap-4 justify-center mt-4">
              <Button
                onClick={handleCreatePlaylist}
                disabled={importLoading}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-lg flex items-center gap-2 min-w-[120px]"
              >
                {importLoading ? (
                  <>
                    <LoaderPinwheel className="animate-spin w-5 h-5" />{' '}
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" /> Yoink
                  </>
                )}
              </Button>
              <Button
                onClick={handleLogout}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-lg flex items-center gap-2 min-w-[120px]"
              >
                <LogOut className="w-5 h-5" /> Logout
              </Button>
            </div>
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
                          <div className="text-white font-semibold">
                            {title}
                          </div>
                          <div className="text-gray-400 text-sm">{artist}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
