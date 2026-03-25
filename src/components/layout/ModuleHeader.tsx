import { scoreToColor } from '@/lib/colors'

interface ModuleHeaderProps {
  title: string
  description?: string
  score?: number
  scoreLabel?: string
}

export function ModuleHeader({ title, description, score, scoreLabel }: ModuleHeaderProps) {
  const scoreColor = score !== undefined ? scoreToColor(score) : undefined

  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e0e0e0]">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-[#999999]">{description}</p>
        )}
      </div>
      {score !== undefined && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold"
          style={{
            borderColor: scoreColor,
            color: scoreColor,
            backgroundColor: `${scoreColor}18`,
          }}
        >
          <span>{score}</span>
          {scoreLabel && <span className="text-xs font-normal opacity-80">{scoreLabel}</span>}
        </div>
      )}
    </div>
  )
}
