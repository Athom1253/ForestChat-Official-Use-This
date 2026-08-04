import { useEffect, useState } from 'react'

interface PetSpriteProps {
  species: string
  color: string
  action: 'idle' | 'walking' | 'eating' | 'playing' | 'sleeping' | 'waking' | 'patted' | 'fetching'
  direction?: number
  size?: number
  accessory?: string | null
}

export function PetSprite({ species, color, action, direction = 1, size = 120, accessory }: PetSpriteProps) {
  const [blink, setBlink] = useState(false)
  const [frame, setFrame] = useState(0)
  const [breathPhase, setBreathPhase] = useState(0)

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 120)
    }, 2500 + Math.random() * 2500)
    return () => clearInterval(blinkInterval)
  }, [])

  useEffect(() => {
    const breathInterval = setInterval(() => {
      setBreathPhase((p) => (p + 0.05) % (Math.PI * 2))
    }, 50)
    return () => clearInterval(breathInterval)
  }, [])

  useEffect(() => {
    if (action === 'walking' || action === 'fetching') {
      const interval = setInterval(() => setFrame((f) => (f + 1) % 4), 130)
      return () => clearInterval(interval)
    } else if (action === 'eating') {
      const interval = setInterval(() => setFrame((f) => (f + 1) % 2), 280)
      return () => clearInterval(interval)
    } else if (action === 'playing') {
      const interval = setInterval(() => setFrame((f) => (f + 1) % 4), 180)
      return () => clearInterval(interval)
    }
    setFrame(0)
  }, [action])

  const isSleeping = action === 'sleeping'
  const isPatted = action === 'patted'
  const isWalking = action === 'walking' || action === 'fetching'
  const isEating = action === 'eating'
  const isPlaying = action === 'playing'

  const breathScale = 1 + Math.sin(breathPhase) * 0.025
  const bodyBob = isWalking ? Math.abs(Math.sin(frame * Math.PI / 2)) * 3 : isPlaying ? Math.abs(Math.sin(frame * Math.PI / 2)) * 6 : 0
  const tailWag = isPlaying ? Math.sin(frame * Math.PI / 2) * 25 : isPatted ? Math.sin(Date.now() / 80) * 18 : isWalking ? Math.sin(frame * Math.PI / 2) * 12 : Math.sin(breathPhase * 0.5) * 4
  const mouthOpen = isEating ? frame === 1 : false
  const eyeScale = blink ? 0.05 : isSleeping ? 0.05 : 1
  const legOffset = isWalking ? [0, -3, -1, -3][frame] : 0
  const legOffset2 = isWalking ? [-3, -1, -3, 0][frame] : 0

  const darker = shadeColor(color, -25)
  const lighter = shadeColor(color, 20)
  const bellyColor = shadeColor(color, 35)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ transform: `scaleX(${direction})`, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={`bodyGrad-${species}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={lighter} />
          <stop offset="60%" stopColor={color} />
          <stop offset="100%" stopColor={darker} />
        </radialGradient>
        <radialGradient id={`headGrad-${species}`} cx="42%" cy="32%" r="60%">
          <stop offset="0%" stopColor={lighter} />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={darker} />
        </radialGradient>
        <filter id={`shadow-${species}`}>
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
          <feOffset dx="0" dy="1" result="offsetblur" />
          <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="50" cy="89" rx={22 + Math.sin(breathPhase) * 1.5} ry="3.5" fill="rgba(0,0,0,0.18)" />

      <g transform={`translate(0, ${-bodyBob})`}>
        {/* Hind legs */}
        <g transform={`translate(38, 78)`}>
          <ellipse cx="0" cy={legOffset} rx="6" ry="8" fill={darker} />
          <ellipse cx="0" cy={legOffset + 2} rx="4" ry="5" fill={color} />
        </g>
        <g transform={`translate(62, 78)`}>
          <ellipse cx="0" cy={legOffset2} rx="6" ry="8" fill={darker} />
          <ellipse cx="0" cy={legOffset2 + 2} rx="4" ry="5" fill={color} />
        </g>

        {/* Front legs */}
        <g transform={`translate(42, 74)`}>
          <ellipse cx="0" cy={legOffset2} rx="5" ry="7" fill={darker} />
          <ellipse cx="0" cy={legOffset2 + 1} rx="3.5" ry="4" fill={color} />
        </g>
        <g transform={`translate(58, 74)`}>
          <ellipse cx="0" cy={legOffset} rx="5" ry="7" fill={darker} />
          <ellipse cx="0" cy={legOffset + 1} rx="3.5" ry="4" fill={color} />
        </g>

        {/* Tail - species specific */}
        {renderTail(species, color, darker, tailWag)}

        {/* Body */}
        <ellipse cx="50" cy="65" rx="22" ry="17" fill={`url(#bodyGrad-${species})`} transform={`scale(1, ${breathScale})`} transform-origin="50 65" />

        {/* Belly */}
        <ellipse cx="50" cy="71" rx="13" ry="9" fill={bellyColor} opacity="0.6" />

        {/* Body shading */}
        <ellipse cx="50" cy="58" rx="18" ry="6" fill={lighter} opacity="0.2" />

        {/* Head */}
        <g transform={`translate(50, 40)`}>
          <ellipse cx="0" cy="0" rx="19" ry="17" fill={`url(#headGrad-${species})`} />

          {/* Species-specific ears */}
          {renderEars(species, color, darker, lighter)}

          {/* Cheek blush when patted or playing */}
          {(isPatted || isPlaying) && (
            <>
              <ellipse cx="-12" cy="4" rx="4" ry="2.5" fill="#f472b6" opacity="0.4" />
              <ellipse cx="12" cy="4" rx="4" ry="2.5" fill="#f472b6" opacity="0.4" />
            </>
          )}

          {/* Eyes */}
          {!isSleeping && !isPatted && (
            <>
              <ellipse cx="-8" cy="-2" rx="3.5" ry={3.5 * eyeScale} fill="#1a1a2e" />
              <ellipse cx="8" cy="-2" rx="3.5" ry={3.5 * eyeScale} fill="#1a1a2e" />
              {!blink && (
                <>
                  <circle cx="-7" cy="-3" r="1.2" fill="white" />
                  <circle cx="9" cy="-3" r="1.2" fill="white" />
                  <circle cx="-8.5" cy="-1" r="0.6" fill="white" opacity="0.5" />
                  <circle cx="7.5" cy="-1" r="0.6" fill="white" opacity="0.5" />
                </>
              )}
            </>
          )}

          {/* Sleeping eyes */}
          {isSleeping && (
            <>
              <path d="M -11 -2 Q -8 0 -5 -2" stroke="#1a1a2e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M 5 -2 Q 8 0 11 -2" stroke="#1a1a2e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </>
          )}

          {/* Happy eyes when patted */}
          {isPatted && (
            <>
              <path d="M -11 -3 Q -8 -6 -5 -3" stroke="#1a1a2e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M 5 -3 Q 8 -6 11 -3" stroke="#1a1a2e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </>
          )}

          {/* Nose */}
          <ellipse cx="0" cy="4" rx="2.5" ry="1.8" fill="#1a1a2e" />
          <ellipse cx="-0.5" cy="3.3" rx="1" ry="0.5" fill="white" opacity="0.3" />

          {/* Mouth */}
          {mouthOpen ? (
            <>
              <ellipse cx="0" cy="8" rx="3.5" ry="2.5" fill="#1a1a2e" />
              <ellipse cx="0" cy="9" rx="2" ry="1.5" fill="#f472b6" />
            </>
          ) : isPatted ? (
            <path d="M -4 8 Q 0 12 4 8" stroke="#1a1a2e" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          ) : isPlaying ? (
            <>
              <path d="M -4 7 Q 0 9 4 7" stroke="#1a1a2e" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <ellipse cx="0" cy="10" rx="3" ry="4" fill="#f472b6" />
            </>
          ) : (
            <path d="M -3 7 Q 0 9 3 7" stroke="#1a1a2e" strokeWidth="1" fill="none" strokeLinecap="round" />
          )}

          {/* Whiskers for cat/fox */}
          {(species === 'cat' || species === 'fox') && !isSleeping && (
            <>
              <line x1="-14" y1="5" x2="-20" y2="3" stroke="#1a1a2e" strokeWidth="0.5" opacity="0.4" />
              <line x1="-14" y1="6" x2="-20" y2="7" stroke="#1a1a2e" strokeWidth="0.5" opacity="0.4" />
              <line x1="14" y1="5" x2="20" y2="3" stroke="#1a1a2e" strokeWidth="0.5" opacity="0.4" />
              <line x1="14" y1="6" x2="20" y2="7" stroke="#1a1a2e" strokeWidth="0.5" opacity="0.4" />
            </>
          )}
        </g>

        {/* Accessory rendered on pet */}
        {accessory && !isSleeping && renderAccessory(accessory)}

        {/* Z's when sleeping */}
        {isSleeping && (
          <>
            <text x="70" y="22" fontSize="9" fill="white" opacity="0.5" fontWeight="bold" style={{ animation: 'floatUp 2s ease-out infinite' }}>z</text>
            <text x="76" y="16" fontSize="7" fill="white" opacity="0.3" fontWeight="bold" style={{ animation: 'floatUp 2s ease-out infinite 0.5s' }}>z</text>
          </>
        )}
      </g>
    </svg>
  )
}

function renderTail(species: string, color: string, darker: string, wag: number): React.ReactNode {
  const transform = `translate(70, 60) rotate(${wag})`
  if (species === 'cat') {
    return (
      <g transform={transform}>
        <path d="M 0 0 Q 8 -8 14 -4 Q 18 0 14 6 Q 8 4 0 2" fill={color} stroke={darker} strokeWidth="0.5" />
      </g>
    )
  }
  if (species === 'dog') {
    return (
      <g transform={transform}>
        <path d="M 0 0 Q 6 -2 12 -8 L 16 -6 Q 10 2 0 4 Z" fill={color} stroke={darker} strokeWidth="0.5" />
        <ellipse cx="14" cy="-7" rx="4" ry="3" fill={darker} />
      </g>
    )
  }
  if (species === 'rabbit') {
    return (
      <g transform={transform}>
        <ellipse cx="6" cy="0" rx="5" ry="3" fill={color} />
        <ellipse cx="6" cy="0" rx="5" ry="3" fill={darker} opacity="0.2" />
      </g>
    )
  }
  if (species === 'fox') {
    return (
      <g transform={transform}>
        <path d="M 0 0 Q 10 -10 18 -4 Q 20 0 16 4 Q 8 2 0 3" fill={color} stroke={darker} strokeWidth="0.5" />
        <ellipse cx="16" cy="-1" rx="3" ry="4" fill="#ffffff" opacity="0.7" />
      </g>
    )
  }
  if (species === 'bear') {
    return (
      <g transform={transform}>
        <ellipse cx="8" cy="0" rx="7" ry="4" fill={color} />
        <ellipse cx="8" cy="0" rx="7" ry="4" fill={darker} opacity="0.15" />
      </g>
    )
  }
  // Default
  return (
    <g transform={transform}>
      <ellipse cx="8" cy="0" rx="8" ry="3.5" fill={color} opacity="0.9" />
    </g>
  )
}

function renderEars(species: string, color: string, darker: string, lighter: string): React.ReactNode {
  if (species === 'cat') {
    return (
      <>
        <path d="M -16 -12 L -20 -22 L -10 -14 Z" fill={color} stroke={darker} strokeWidth="0.5" />
        <path d="M -15 -13 L -17 -19 L -12 -14 Z" fill="#f472b6" opacity="0.5" />
        <path d="M 16 -12 L 20 -22 L 10 -14 Z" fill={color} stroke={darker} strokeWidth="0.5" />
        <path d="M 15 -13 L 17 -19 L 12 -14 Z" fill="#f472b6" opacity="0.5" />
      </>
    )
  }
  if (species === 'dog') {
    return (
      <>
        <ellipse cx="-14" cy="-12" rx="7" ry="11" fill={color} stroke={darker} strokeWidth="0.5" transform="rotate(-25 -14 -12)" />
        <ellipse cx="-14" cy="-10" rx="4" ry="7" fill={darker} opacity="0.3" transform="rotate(-25 -14 -10)" />
        <ellipse cx="14" cy="-12" rx="7" ry="11" fill={color} stroke={darker} strokeWidth="0.5" transform="rotate(25 14 -12)" />
        <ellipse cx="14" cy="-10" rx="4" ry="7" fill={darker} opacity="0.3" transform="rotate(25 14 -10)" />
      </>
    )
  }
  if (species === 'rabbit') {
    return (
      <>
        <ellipse cx="-8" cy="-18" rx="4.5" ry="13" fill={color} stroke={darker} strokeWidth="0.5" />
        <ellipse cx="-8" cy="-17" rx="2.5" ry="9" fill="#f472b6" opacity="0.35" />
        <ellipse cx="8" cy="-18" rx="4.5" ry="13" fill={color} stroke={darker} strokeWidth="0.5" />
        <ellipse cx="8" cy="-17" rx="2.5" ry="9" fill="#f472b6" opacity="0.35" />
      </>
    )
  }
  if (species === 'fox') {
    return (
      <>
        <path d="M -15 -12 L -22 -24 L -8 -14 Z" fill={color} stroke={darker} strokeWidth="0.5" />
        <path d="M -14 -13 L -18 -20 L -11 -14 Z" fill={darker} opacity="0.4" />
        <path d="M 15 -12 L 22 -24 L 8 -14 Z" fill={color} stroke={darker} strokeWidth="0.5" />
        <path d="M 14 -13 L 18 -20 L 11 -14 Z" fill={darker} opacity="0.4" />
      </>
    )
  }
  if (species === 'bear') {
    return (
      <>
        <circle cx="-13" cy="-13" r="6.5" fill={color} stroke={darker} strokeWidth="0.5" />
        <circle cx="-13" cy="-13" r="3.5" fill={darker} opacity="0.25" />
        <circle cx="13" cy="-13" r="6.5" fill={color} stroke={darker} strokeWidth="0.5" />
        <circle cx="13" cy="-13" r="3.5" fill={darker} opacity="0.25" />
      </>
    )
  }
  // Default small round ears
  return (
    <>
      <circle cx="-12" cy="-13" r="5" fill={color} stroke={darker} strokeWidth="0.5" />
      <circle cx="12" cy="-13" r="5" fill={color} stroke={darker} strokeWidth="0.5" />
    </>
  )
}

function renderAccessory(accessoryId: string): React.ReactNode {
  if (accessoryId === 'hat') {
    return (
      <g transform="translate(50, 18)">
        <rect x="-10" y="0" width="20" height="3" rx="1" fill="#1a1a2e" />
        <rect x="-7" y="-12" width="14" height="14" rx="2" fill="#1a1a2e" />
        <rect x="-7" y="-3" width="14" height="3" fill="#dc2626" />
      </g>
    )
  }
  if (accessoryId === 'bow') {
    return (
      <g transform="translate(50, 24)">
        <path d="M -8 -3 L -2 0 L -8 3 Z" fill="#dc2626" />
        <path d="M 8 -3 L 2 0 L 8 3 Z" fill="#dc2626" />
        <ellipse cx="0" cy="0" rx="2.5" ry="3" fill="#b91c1c" />
      </g>
    )
  }
  if (accessoryId === 'glasses') {
    return (
      <g transform="translate(50, 38)">
        <circle cx="-7" cy="0" r="5" fill="none" stroke="#1a1a2e" strokeWidth="1.5" />
        <circle cx="7" cy="0" r="5" fill="none" stroke="#1a1a2e" strokeWidth="1.5" />
        <line x1="-2" y1="0" x2="2" y2="0" stroke="#1a1a2e" strokeWidth="1.5" />
        <circle cx="-7" cy="0" r="4.5" fill="#7dd3fc" opacity="0.15" />
        <circle cx="7" cy="0" r="4.5" fill="#7dd3fc" opacity="0.15" />
      </g>
    )
  }
  if (accessoryId === 'scarf') {
    return (
      <g transform="translate(50, 52)">
        <path d="M -14 0 Q 0 4 14 0 L 14 5 Q 0 9 -14 5 Z" fill="#dc2626" />
        <path d="M -14 0 Q 0 4 14 0" fill="none" stroke="#b91c1c" strokeWidth="0.5" />
        <rect x="8" y="3" width="4" height="10" rx="1" fill="#dc2626" transform="rotate(15 10 8)" />
      </g>
    )
  }
  if (accessoryId === 'crown') {
    return (
      <g transform="translate(50, 20)">
        <path d="M -10 0 L -10 -8 L -5 -3 L 0 -10 L 5 -3 L 10 -8 L 10 0 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="0.5" />
        <circle cx="0" cy="-6" r="1.5" fill="#dc2626" />
        <circle cx="-7" cy="-3" r="1" fill="#3b82f6" />
        <circle cx="7" cy="-3" r="1" fill="#3b82f6" />
        <rect x="-10" y="-1" width="20" height="2" fill="#b45309" opacity="0.3" />
      </g>
    )
  }
  if (accessoryId === 'flower') {
    return (
      <g transform="translate(36, 28)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-4" rx="2.5" ry="4" fill="#f472b6" transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="0" r="2.5" fill="#fbbf24" />
      </g>
    )
  }
  return null
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, Math.min(255, (num >> 16) + amt))
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt))
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt))
  return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)
}

interface HeartParticleProps {
  hearts: { id: number; x: number; y: number }[]
}

export function HeartParticles({ hearts }: HeartParticleProps) {
  return (
    <>
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute pointer-events-none"
          style={{
            left: `${h.x}%`,
            top: `${h.y}%`,
            animation: 'floatUp 1.5s ease-out forwards',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#f472b6">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      ))}
    </>
  )
}
