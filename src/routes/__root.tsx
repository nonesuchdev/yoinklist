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
        title: 'YoinkList - Spotify Playlists to Tidal',
      },
      // Open Graph for Facebook and Bluesky
      {
        property: 'og:title',
        content: 'YoinkList - Spotify Playlists to Tidal',
      },
      {
        property: 'og:description',
        content: 'Copy public Spotify playlists to your Tidal account.',
      },
      {
        property: 'og:image',
        content: 'https://yoink.nonesuch.dev/web-app-manifest-512x512.png',
      },
      {
        property: 'og:image:secure_url',
        content: 'https://yoink.nonesuch.dev/web-app-manifest-512x512.png',
      },
      {
        property: 'og:image:type',
        content: 'image/png',
      },
      {
        property: 'og:image:width',
        content: '512',
      },
      {
        property: 'og:image:height',
        content: '512',
      },
      {
        property: 'og:image:alt',
        content: 'YoinkList — copy Spotify playlists to Tidal',
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
        content: 'YoinkList - Spotify Playlists to Tidal',
      },
      {
        name: 'twitter:description',
        content: 'Copy public Spotify playlists to your Tidal account.',
      },
      {
        name: 'twitter:url',
        content: 'https://yoink.nonesuch.dev',
      },
      {
        name: 'twitter:image',
        content: 'https://yoink.nonesuch.dev/web-app-manifest-512x512.png',
      },
      {
        name: 'twitter:image:alt',
        content: 'YoinkList — copy Spotify playlists to Tidal',
      },
      // Additional general-purpose meta tags for link previews
      {
        name: 'image',
        content: 'https://yoink.nonesuch.dev/web-app-manifest-512x512.png',
      },
      {
        itemprop: 'image',
        content: 'https://yoink.nonesuch.dev/web-app-manifest-512x512.png',
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
      {
        rel: 'image_src',
        href: 'https://yoink.nonesuch.dev/web-app-manifest-512x512.png',
      },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'YoinkList',
          image: 'https://yoink.nonesuch.dev/web-app-manifest-512x512.png',
        }),
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
