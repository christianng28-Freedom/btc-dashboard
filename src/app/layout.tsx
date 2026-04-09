import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { WebSocketProvider } from '@/providers/WebSocketProvider'
import { NotificationProvider } from '@/providers/NotificationProvider'
import { TopBar } from '@/components/layout/TopBar'
import { NavSidebar } from '@/components/layout/NavSidebar'
import { MainArea } from '@/components/layout/MainArea'
import { RegisterSW } from '@/components/layout/RegisterSW'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Investment Command Centre',
  description: 'Multi-asset investment analytics dashboard',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Command',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon.svg',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
  themeColor: '#05070A',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#05070A] text-[#e0e0e0] min-h-screen">
        <RegisterSW />
        <QueryProvider>
          <ThemeProvider>
            <WebSocketProvider>
              <NotificationProvider>
                <div className="app-shell flex flex-col h-screen overflow-hidden">
                  <TopBar />
                  <div className="flex flex-1 overflow-hidden">
                    <NavSidebar />
                    <MainArea>{children}</MainArea>
                  </div>
                </div>
              </NotificationProvider>
            </WebSocketProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
