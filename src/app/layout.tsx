import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Reframe - AI Creative Recomposition',
  description: 'One image. Every format. AI-powered recomposition for marketing teams.',
  openGraph: {
    title: 'Reframe',
    description: 'AI-powered image recomposition for every ad and social format.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
