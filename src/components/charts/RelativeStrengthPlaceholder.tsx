interface PlaceholderProps {
  title: string
  description: string
  v2Note?: string
}

export function RelativeStrengthPlaceholder({ title, description, v2Note }: PlaceholderProps) {
  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div>
        <div className="text-xs font-bold text-[#e0e0e0] font-mono">{title}</div>
        <div className="text-[10px] text-[#555566] font-mono">{description}</div>
      </div>
      <div className="flex items-center justify-center h-24 border border-dashed border-[#1a1a2e] rounded-lg">
        <div className="text-center">
          <div className="text-[10px] font-mono text-[#444455]">Live data in V2</div>
          {v2Note && <div className="text-[9px] font-mono text-[#333344] mt-1">{v2Note}</div>}
        </div>
      </div>
    </div>
  )
}
