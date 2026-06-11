'use client'

/**
 * "Aurora night" ambient backdrop, mounted app-wide from the root layout.
 * Three large blurred color fields drift very slowly behind the content.
 * Faint enough that all text and cards remain fully readable; transform-only
 * animation keeps it on the GPU; disabled for prefers-reduced-motion.
 */
export function AuroraBackground() {
  return (
    <>
      <div aria-hidden className="aurora-layer pointer-events-none fixed inset-0 overflow-hidden">
        <div className="aurora-blob aurora-a" />
        <div className="aurora-blob aurora-b" />
        <div className="aurora-blob aurora-c" />
      </div>
      <style>{`
        .aurora-layer { z-index: 0; }
        .aurora-blob {
          position: absolute;
          width: 65vw;
          height: 60vh;
          border-radius: 50%;
          filter: blur(70px);
          will-change: transform;
          mix-blend-mode: screen;
        }
        .aurora-a {
          top: -18%;
          left: 8%;
          background: radial-gradient(ellipse at center, rgba(45, 212, 191, 0.20), transparent 68%);
          animation: aurora-drift-a 46s ease-in-out infinite alternate;
        }
        .aurora-b {
          top: -10%;
          right: -5%;
          background: radial-gradient(ellipse at center, rgba(99, 102, 241, 0.18), transparent 68%);
          animation: aurora-drift-b 58s ease-in-out infinite alternate;
        }
        .aurora-c {
          top: 22%;
          left: 30%;
          width: 55vw;
          height: 45vh;
          background: radial-gradient(ellipse at center, rgba(74, 222, 128, 0.14), transparent 68%);
          animation: aurora-drift-c 70s ease-in-out infinite alternate;
        }
        @keyframes aurora-drift-a {
          from { transform: translate3d(-6%, 0, 0) rotate(-4deg) scaleX(1); }
          to   { transform: translate3d(10%, 6%, 0) rotate(5deg) scaleX(1.15); }
        }
        @keyframes aurora-drift-b {
          from { transform: translate3d(4%, 3%, 0) rotate(6deg) scaleY(1.1); }
          to   { transform: translate3d(-9%, -4%, 0) rotate(-3deg) scaleY(0.95); }
        }
        @keyframes aurora-drift-c {
          from { transform: translate3d(-5%, 5%, 0) rotate(2deg); }
          to   { transform: translate3d(8%, -6%, 0) rotate(-5deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .aurora-blob { animation: none; }
        }
      `}</style>
    </>
  )
}
