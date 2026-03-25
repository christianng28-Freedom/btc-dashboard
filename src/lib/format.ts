/**
 * Format a number as a USD price string.
 * e.g. 84350.12 -> "$84,350.12"
 */
export function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/**
 * Format a percentage change with sign.
 * e.g. 2.4 -> "+2.40%", -1.2 -> "-1.20%"
 */
export function formatChange(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

/**
 * Format a large volume as a compact USD string.
 * e.g. 1_200_000_000 -> "$1.2B"
 */
export function formatVolume(n: number): string {
  if (n >= 1_000_000_000_000) {
    return `$${(n / 1_000_000_000_000).toFixed(2)}T`
  }
  if (n >= 1_000_000_000) {
    return `$${(n / 1_000_000_000).toFixed(1)}B`
  }
  if (n >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(0)}M`
  }
  return `$${formatNumber(n)}`
}

/**
 * Format a number with thousands separators.
 * e.g. 1234567 -> "1,234,567"
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

/**
 * Format a number in compact notation.
 * e.g. 1_200_000_000_000 -> "1.2T", 500_000_000 -> "500B", 120_000_000 -> "120M"
 */
export function formatCompact(n: number): string {
  if (n >= 1_000_000_000_000) {
    return `${(n / 1_000_000_000_000).toFixed(1)}T`
  }
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(0)}B`
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(0)}M`
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(0)}K`
  }
  return String(n)
}

/**
 * Format a hash rate in EH/s.
 * e.g. 600_000_000_000_000_000_000 -> "600 EH/s"
 */
export function formatHashRate(n: number): string {
  // n is in H/s
  const eh = n / 1e18
  if (eh >= 1) {
    return `${eh.toFixed(0)} EH/s`
  }
  const ph = n / 1e15
  if (ph >= 1) {
    return `${ph.toFixed(0)} PH/s`
  }
  const th = n / 1e12
  return `${th.toFixed(0)} TH/s`
}

/**
 * Format a satoshi amount as a BTC string.
 * e.g. 42100 sats -> "0.00042100 BTC"
 */
export function formatSats(sats: number): string {
  const btc = sats / 1e8
  return `${btc.toFixed(8)} BTC`
}
