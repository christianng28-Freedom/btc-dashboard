import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// Same "surge line" mark as src/app/icon.svg, drawn full-bleed because iOS
// applies its own corner mask. Satori has no SVG filters, so the glow is a
// wide low-opacity stroke instead of a blur.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #151b28 0%, #090c12 100%)',
        }}
      >
        <svg width="180" height="180" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00A3FF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#00A3FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M6 22 L11 17 L15 19.5 L20 11 L26 8 L26 26 L6 26 Z" fill="url(#area)" />
          <polyline
            points="6,22 11,17 15,19.5 20,11 26,8"
            fill="none"
            stroke="#00A3FF"
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.25"
          />
          <polyline
            points="6,22 11,17 15,19.5 20,11 26,8"
            fill="none"
            stroke="#00A3FF"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx="26" cy="8" r="2.6" fill="#f7931a" stroke="#0b0e14" strokeWidth="1" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
