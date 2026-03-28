'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  exactMatch?: boolean
  icon: React.ReactNode
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Global Outlook',
    items: [
      {
        href: '/',
        label: 'Global Overview',
        exactMatch: true,
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        href: '/global/economic',
        label: 'Economic',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      {
        href: '/global/rates',
        label: 'Rates',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
            />
          </svg>
        ),
      },
      {
        href: '/global/commodities',
        label: 'Commodities',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7"
            />
          </svg>
        ),
      },
      {
        href: '/global/equities',
        label: 'Equities',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
        ),
      },
      {
        href: '/global/forex',
        label: 'Forex',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        href: '/global/liquidity',
        label: 'Liquidity',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Bitcoin Outlook',
    items: [
      {
        href: '/bitcoin',
        label: 'Overview',
        exactMatch: true,
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        ),
      },
      {
        href: '/bitcoin/technical',
        label: 'Technical',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
        ),
      },
      {
        href: '/bitcoin/fundamental',
        label: 'Fundamental',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      {
        href: '/bitcoin/market-cap',
        label: 'Market Cap',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      {
        href: '/bitcoin/on-chain',
        label: 'On-Chain',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        ),
      },
      {
        href: '/bitcoin/regulation',
        label: 'Regulation',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            />
          </svg>
        ),
      },
    ],
  },
]

export function NavSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-14 sm:w-16 lg:w-60 flex-shrink-0 flex flex-col py-1 px-1 sm:py-2 sm:px-2">
      {/* Floating glass panel */}
      <div className="flex flex-col h-full rounded-xl border border-white/[0.07] overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(30px)' }}>

        {/* Scrollable nav — needed on small landscape screens */}
        <div className="relative flex-1 min-h-0">
          {/* Fade hint at bottom — visible on non-desktop when overflow may occur */}
          <div
            className="lg:hidden pointer-events-none absolute bottom-0 left-0 right-0 h-8 z-10 rounded-b-xl"
            style={{ background: 'linear-gradient(to top, rgba(10,12,18,0.85) 0%, transparent 100%)' }}
          />
        <nav className="flex flex-col gap-3 px-2 pt-4 pb-4 overflow-y-auto h-full"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {navGroups.map((group) => (
            <div key={group.label}>
              {/* Group label — only visible on large screens */}
              <div className="hidden lg:flex items-center gap-2 px-2 mb-2">
                <span
                  className="w-3 h-px flex-shrink-0"
                  style={{ background: 'linear-gradient(90deg, #00A3FF, rgba(0,163,255,0.15))' }}
                />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">
                  {group.label}
                </span>
              </div>

              <div className="flex flex-col gap-[2px]">
                {group.items.map((item) => {
                  const isActive = item.exactMatch
                    ? pathname === item.href
                    : pathname.startsWith(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Left pill glow indicator */}
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full bg-[#00A3FF]"
                          style={{ boxShadow: '0 0 8px 2px rgba(0,163,255,0.55)' }}
                        />
                      )}

                      {/* Icon — shifts 2px right on hover */}
                      <span
                        className={`flex-shrink-0 transition-transform duration-200 ease-in ${
                          isActive
                            ? 'text-[#00A3FF]'
                            : 'text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5'
                        }`}
                      >
                        {item.icon}
                      </span>

                      {/* Label */}
                      {isActive ? (
                        <span
                          className="hidden lg:block text-[13px] font-medium leading-none"
                          style={{
                            background: 'linear-gradient(90deg, #ffffff 0%, #00A3FF 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {item.label}
                        </span>
                      ) : (
                        <span className="hidden lg:block text-[13px] font-medium text-white/35 group-hover:text-white/70 transition-colors duration-200 leading-none">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
        </div>

        {/* Bottom profile section */}
        <div className="mt-auto px-2 py-3 border-t border-white/[0.05]">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors duration-200 cursor-pointer">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border border-white/10"
              style={{ background: 'linear-gradient(135deg, rgba(0,163,255,0.3) 0%, rgba(0,163,255,0.07) 100%)' }}
            >
              <span className="text-[10px] font-semibold text-[#00A3FF]">IC</span>
            </div>
            <div className="hidden lg:flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-white/60 leading-none">Investor</span>
              <span className="text-[9px] text-white/25 uppercase tracking-[0.12em] leading-none mt-0.5">Command</span>
            </div>
          </div>
        </div>

      </div>
    </aside>
  )
}
