import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { WebSocketProvider } from '@/providers/WebSocketProvider'
import { TopBar } from '@/components/layout/TopBar'
import { NavSidebar } from '@/components/layout/NavSidebar'
import { MainArea } from '@/components/layout/MainArea'

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
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#05070A] text-[#e0e0e0] min-h-screen">
        <QueryProvider>
          <ThemeProvider>
            <WebSocketProvider>
              <div className="flex flex-col h-screen overflow-hidden">
                <TopBar />
                <div className="flex flex-1 overflow-hidden">
                  <NavSidebar />
                  <MainArea>{children}</MainArea>
                </div>
              </div>
            </WebSocketProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
