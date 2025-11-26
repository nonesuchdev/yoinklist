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
  getPlaylistProgress,
  importSpotifyToTidal,
  tidalFinalizeLogin,
  tidalInitLogin,
  tidalLogoutServer,
} from '../actions'

function Home() {
  const [playlistTitle, setPlaylistTitle] = useState<string>('')
  const [importLoading, setImportLoading] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [progress, setProgress] = useState<{
    current: number
    total: number
    playlistId: string
  } | null>(null)
  const [isComplete, setIsComplete] = useState<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const checkCredentials = useServerFn(checkTidalCredentials)
  const initLoginFn = useServerFn(tidalInitLogin)
  const finalizeLoginFn = useServerFn(tidalFinalizeLogin)
  const logoutServerFn = useServerFn(tidalLogoutServer)
  const importSpotifyToTidalFn = useServerFn(importSpotifyToTidal)
  const getProgressFn = useServerFn(getPlaylistProgress)

  useEffect(() => {
    setLoading(true)
    const sessionId = getOrCreateSessionId()
    checkCredentials({ data: { sessionId } })
      .then((result) => {
        setIsLoggedIn(result.isLoggedIn)
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

  useEffect(() => {
    if (!progress || isComplete) return
    const interval = setInterval(async () => {
      try {
        const { current } = await getProgressFn({
          data: {
            sessionId: getOrCreateSessionId(),
            playlistId: progress.playlistId,
          },
        })
        console.log(`Progress: ${current} / ${progress.total}`)
        setProgress((prev) => (prev ? { ...prev, current } : null))
        if (current >= progress.total) {
          setIsComplete(true)
          clearInterval(interval)
        }
      } catch (err) {
        console.error('Progress check failed:', err)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [progress, getProgressFn, isComplete])

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
      setPlaylistTitle(result.playlistName)
      // Start progress polling
      setIsComplete(false)
      setProgress({
        current: 0,
        total: result.totalTracks,
        playlistId: result.playlistId,
      })
    } catch (err: any) {
      if (err.message && err.message.includes('session expired')) {
        logoutServerFn({ data: { sessionId: getOrCreateSessionId() } })
          .then(() => {
            setIsLoggedIn(false)
          })
          .catch(() => {})
        setError('Your Tidal session has expired. Please log in again.')
      } else {
        setError(err.message || 'Failed to create playlist')
      }
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
              Spotify Playlist Link
            </label>
            <Input
              ref={inputRef}
              placeholder="Paste the share link from a public playlist"
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
            {progress && (
              <div className="mt-8">
                <div className="text-white mb-4">
                  <div className="text-xl font-bold">
                    Created "{playlistTitle.trim()}"
                  </div>
                  <div>
                    Copying tracks: {progress.current} / {progress.total}
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(progress.current / progress.total) * 100}%`,
                        }}
                      ></div>
                    </div>
                    {isComplete && (
                      <div className="mt-2 text-green-400">
                        All {progress.total} tracks copied successfully!
                      </div>
                    )}
                  </div>
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
