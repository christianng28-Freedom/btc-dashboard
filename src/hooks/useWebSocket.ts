'use client'
import { useWebSocketContext } from '@/providers/WebSocketProvider'

/**
 * Consumes WebSocketContext and returns live price data.
 */
export function useWebSocket() {
  const { lastPrice, priceChange, priceChangePercent, connectionStatus } =
    useWebSocketContext()
  return { lastPrice, priceChange, priceChangePercent, connectionStatus }
}
