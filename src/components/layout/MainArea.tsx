'use client'
import { usePathname } from 'next/navigation'
import { PersistentOnChainPanel } from './PersistentOnChainPanel'

export function MainArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isOnChain = pathname === '/bitcoin/on-chain'

  return (
    <main className="flex-1 overflow-y-auto p-6">
      {/* Regular pages — hidden when on-chain tab is active */}
      {!isOnChain && children}
      {/* On-chain panel — stays mounted after first visit so iframes survive tab switches */}
      <PersistentOnChainPanel isActive={isOnChain} />
    </main>
  )
}
