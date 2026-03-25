import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1c1a2e 0%, #0a0a14 100%)',
        }}
      >
        <div
          style={{
            width: 148,
            height: 148,
            borderRadius: '50%',
            background: 'rgba(247, 147, 26, 0.15)',
            border: '5px solid rgba(247, 147, 26, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 84,
              color: '#f7931a',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            B
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
