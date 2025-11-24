import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'YoinkList - Import Spotify Playlists to Tidal',
      },
      // Open Graph for Facebook and Bluesky
      {
        property: 'og:title',
        content: 'YoinkList - Import Spotify Playlists to Tidal',
      },
      {
        property: 'og:description',
        content: 'Easily copy your Spotify playlists to Tidal with YoinkList.',
      },
      {
        property: 'og:image',
        content: '/web-app-manifest-512x512.png',
      },
      {
        property: 'og:url',
        content: 'https://yoink.nonesuch.dev',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      // Twitter Card
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'YoinkList - Import Spotify Playlists to Tidal',
      },
      {
        name: 'twitter:description',
        content: 'Easily copy your Spotify playlists to Tidal with YoinkList.',
      },
      {
        name: 'twitter:image',
        content: '/web-app-manifest-512x512.png',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: 'favicon.ico',
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
