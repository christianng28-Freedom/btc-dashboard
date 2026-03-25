'use client'
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { ConnectionStatus } from '@/lib/types'

interface WebSocketContextValue {
  lastPrice: number | null
  priceChange: number | null
  priceChangePercent: number | null
  connectionStatus: ConnectionStatus
}

const WebSocketContext = createContext<WebSocketContextValue>({
  lastPrice: null,
  priceChange: null,
  priceChangePercent: null,
  connectionStatus: 'connecting',
})

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@ticker'
const MAX_BACKOFF_MS = 30_000

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [lastPrice, setLastPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number | null>(null)
  const [priceChangePercent, setPriceChangePercent] = useState<number | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!isMountedRef.current) return

    setConnectionStatus('connecting')

    const ws = new WebSocket(BINANCE_WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (!isMountedRef.current) return
      reconnectAttemptRef.current = 0
      setConnectionStatus('live')
    }

    ws.onmessage = (event: MessageEvent) => {
      if (!isMountedRef.current) return
      try {
        const data = JSON.parse(event.data as string) as {
          c?: string // last price
          P?: string // price change percent
          p?: string // price change
        }
        if (data.c !== undefined) setLastPrice(parseFloat(data.c))
        if (data.p !== undefined) setPriceChange(parseFloat(data.p))
        if (data.P !== undefined) setPriceChangePercent(parseFloat(data.P))
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      if (!isMountedRef.current) return
      setConnectionStatus('disconnected')

      // Exponential backoff
      const attempt = reconnectAttemptRef.current
      const delay = Math.min(1_000 * Math.pow(2, attempt), MAX_BACKOFF_MS)
      reconnectAttemptRef.current = attempt + 1

      reconnectTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) connect()
      }, delay)
    }

    ws.onerror = () => {
      if (!isMountedRef.current) return
      setConnectionStatus('disconnected')
      ws.close()
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    connect()

    return () => {
      isMountedRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect on intentional close
        wsRef.current.close()
      }
    }
  }, [connect])

  return (
    <WebSocketContext.Provider
      value={{ lastPrice, priceChange, priceChangePercent, connectionStatus }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocketContext = () => useContext(WebSocketContext)
