import { useState, useEffect } from "react";
import {
  init,
  initializeLogin,
  finalizeLogin,
  logout,
  credentialsProvider,
} from "@tidal-music/auth";
import { createAPIClient } from "@tidal-music/api";

const {
  VITE_TIDAL_CLIENT_ID: clientId,
  VITE_TIDAL_CLIENT_SECRET: clientSecret,
  VITE_SPOTIFY_CLIENT_ID: spotifyClientId,
  VITE_SPOTIFY_CLIENT_SECRET: spotifyClientSecret,
} = import.meta.env;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [apiClient, setApiClient] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [importedTracks, setImportedTracks] = useState<
    { name: string; cover: string }[]
  >([]);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [copiedCount, setCopiedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    // Initialize Tidal Auth for user authentication (OAuth flow)
    init({
      clientId,
      clientSecret,
      credentialsStorageKey: "tidal-credentials",
      scopes: ["user.read", "playlists.write"],
    })
      .then(async () => {
        // Check if user is already logged in with valid credentials
        try {
          const credentials = await credentialsProvider.getCredentials();
          if (credentials.token && credentials.userId) {
            setIsLoggedIn(true);
            const client = createAPIClient(credentialsProvider);
            setApiClient(client);
            console.log(
              "User already logged in with userId:",
              credentials.userId
            );
          } else {
            console.log("No valid credentials found");
          }
        } catch (error) {
          console.log("Error checking credentials:", error);
        }
      })
      .catch(console.error);
  }, []);

  const handleLogin = async () => {
    try {
      const authUrl = await initializeLogin({
        redirectUri: window.location.origin,
      });
      // Redirect to Tidal
      window.location.href = authUrl;
    } catch (error) {
      console.error("Login failed:", error);
      alert(`Login failed: ${String(error)}`);
    }
  };

  useEffect(() => {
    const handleRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      if (code) {
        console.log("Authorization code received:", code);
        // Re-init auth before finalize to ensure proper state
        await init({
          clientId,
          clientSecret,
          credentialsStorageKey: "tidal-credentials",
          scopes: ["user.read", "playlists.write"],
        });
        finalizeLogin(window.location.search.slice(1))
          .then(async () => {
            console.log("Login finalized successfully");
            // Check credentials after finalize
            const credentials = await credentialsProvider.getCredentials();
            console.log("Credentials after finalize:", credentials);
            setIsLoggedIn(true);
            // Create API client
            const client = createAPIClient(credentialsProvider);
            setApiClient(client);
            // Clean up URL
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          })
          .catch((error) => {
            console.error("Finalize login failed:", error);
            alert(`Finalize login failed: ${String(error)}`);
          });
      }
    };
    handleRedirect();
  }, []);

  const getSpotifyAccessToken = async () => {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(
          `${spotifyClientId}:${spotifyClientSecret}`
        )}`,
      },
      body: "grant_type=client_credentials",
    });
    const data = await response.json();
    return data.access_token;
  };

  const fetchSpotifyPlaylistInfo = async (
    playlistId: string,
    accessToken: string
  ) => {
    let allTracks: { artist: string; title: string }[] = [];
    let url = `https://api.spotify.com/v1/playlists/${playlistId}`;
    let playlistName = "";
    while (url) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();
      if (!playlistName) playlistName = data.name; // Capture name once
      const tracks = data.tracks.items.map((item: any) => ({
        artist: item.track.artists[0].name,
        title: item.track.name,
      }));
      allTracks = allTracks.concat(tracks);
      url = data.tracks.next; // Next page URL or null
    }
    return {
      name: playlistName,
      tracks: allTracks,
    };
  };

  const fetchSpotifyTrackInfo = async (
    trackId: string,
    accessToken: string
  ) => {
    const response = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const data = await response.json();
    return {
      name: data.name,
      tracks: [
        {
          artist: data.artists[0].name,
          title: data.name,
        },
      ],
    };
  };

  const doSearch = async (query: string) => {
    const { data, error } = await apiClient.GET("/searchResults/{id}", {
      params: {
        path: { id: query },
        query: { countryCode: "US", include: "tracks,albums" },
      },
    });
    if (error) {
      throw error;
    }
    return data;
  };

  const createPlaylist = async (title: string) => {
    const { data, error } = await apiClient.POST("/playlists", {
      body: {
        data: {
          type: "playlists",
          attributes: {
            name: title,
            privacy: "private",
          },
        },
      },
    });
    if (error) {
      throw error;
    }
    return data.data.id;
  };

  const addTracksToPlaylist = async (playlistId: string, uris: string[]) => {
    const trackData = uris.map((uri) => {
      const id = uri.split(":")[2];
      return {
        type: "tracks",
        id,
        meta: {
          addedAt: new Date().toISOString(),
        },
      };
    });
    const { error } = await apiClient.POST(
      `/playlists/${playlistId}/relationships/items`,
      {
        body: { data: trackData },
      }
    );
    if (error) {
      throw error;
    }
  };

  const handleCreatePlaylist = async () => {
    if (!apiClient) return;
    setIsLoading(true);
    try {
      let tracks = [
        { artist: "The Beatles", title: "Hey Jude" },
        { artist: "Queen", title: "Bohemian Rhapsody" },
      ];
      let playlistTitle = "Spotify Import Test";

      if (spotifyUrl) {
        // Parse Spotify URL for playlist or track ID
        const playlistMatch = spotifyUrl.match(/playlist\/([a-zA-Z0-9]+)/);
        const trackMatch = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
        if (!playlistMatch && !trackMatch) {
          alert("Invalid Spotify URL. Please provide a playlist or track URL.");
          return;
        }
        const accessToken = await getSpotifyAccessToken();
        let playlistInfo!: {
          name: string;
          tracks: { artist: string; title: string }[];
        };
        if (playlistMatch) {
          const playlistId = playlistMatch[1];
          console.log("Fetching Spotify playlist:", playlistId);
          playlistInfo = await fetchSpotifyPlaylistInfo(
            playlistId,
            accessToken
          );
        } else if (trackMatch) {
          const trackId = trackMatch[1];
          console.log("Fetching Spotify track:", trackId);
          playlistInfo = await fetchSpotifyTrackInfo(trackId, accessToken);
        }
        tracks = playlistInfo.tracks;
        playlistTitle = playlistInfo.name;
        console.log("Fetched tracks from Spotify:", tracks);
      }

      // Step 1: Search for each track on Tidal to get Tidal track URIs
      const tidalTracks = [];
      const trackInfos = [];
      for (const track of tracks) {
        const searchResult = await doSearch(`${track.artist} ${track.title}`);
        if (searchResult?.data?.relationships?.tracks?.data?.length > 0) {
          const trackData = searchResult.data.relationships.tracks.data[0];
          const uri = `tidal:track:${trackData.id}`;
          tidalTracks.push(uri);
          const cover =
            trackData.relationships?.album?.data?.attributes?.cover || "";
          trackInfos.push({
            name: `${track.artist} - ${track.title}`,
            cover,
          });
        }
      }

      // Step 2: Create a new playlist on Tidal
      const playlistId = await createPlaylist(playlistTitle);

      // Step 3: Add the found tracks to the playlist
      await addTracksToPlaylist(playlistId, tidalTracks);

      // Update UI with success info
      setImportedTracks(trackInfos.slice(0, 5)); // Show first 5 tracks as teaser
      setPlaylistTitle(playlistTitle);
      setCopiedCount(tidalTracks.length);
      setTotalCount(tracks.length);
      setSuccessMessage("success");
    } catch (error) {
      console.error("Failed to create playlist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
    setApiClient(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#282c34] text-white px-4">
      <h1 className="text-2xl mb-8 flex flex-col items-center">
        YoinkList
        <div className="text-sm text-gray-400">
          Copy Spotify playlists to Tidal
        </div>
      </h1>
      {!isLoggedIn ? (
        <button
          onClick={handleLogin}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg cursor-pointer"
          type="button"
        >
          Login to Tidal
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
            disabled={isLoading}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-sm text-md mr-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Importing..." : "Import Playlist"}
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-sm text-md"
          >
            Logout
          </button>
          {successMessage && (
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
                  const [artist, title] = track.name.split(" - ");
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
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
