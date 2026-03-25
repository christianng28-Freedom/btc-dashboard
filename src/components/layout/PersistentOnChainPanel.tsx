'use client'
import { useState, useEffect } from 'react'
import { OnChainContent } from './OnChainContent'

interface Props {
  isActive: boolean
}

// Mounts the on-chain iframe content once on first visit, then keeps it in the
// DOM permanently — hidden via display:none when inactive. This preserves all
// loaded iframes so returning to the tab is instant.
export function PersistentOnChainPanel({ isActive }: Props) {
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (isActive && !hasLoaded) {
      setHasLoaded(true)
    }
  }, [isActive, hasLoaded])

  // Don't render anything until the user first visits on-chain
  if (!hasLoaded) return null

  return (
    <div style={{ display: isActive ? 'block' : 'none' }}>
      <OnChainContent />
    </div>
  )
}
