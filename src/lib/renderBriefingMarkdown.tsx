import type { ReactNode } from 'react'

function mkLink(href: string, label: string, i: number): ReactNode {
  return (
    <a
      key={i}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#00A3FF] hover:text-[#4dc0ff] underline decoration-dotted underline-offset-2 transition-colors break-all"
    >
      {label}
    </a>
  )
}

// Splits a string on markdown links, bold, italic, and bare https:// URLs
const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/\S+)/g

function renderInline(text: string, labelColor?: string): ReactNode {
  const parts = text.split(INLINE_RE)
  return parts.map((part, i) => {
    // [label](url)
    const mdLink = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/)
    if (mdLink) return mkLink(mdLink[2], mdLink[1], i)
    // bare URL
    if (/^https?:\/\//.test(part)) return mkLink(part, part, i)
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className={`font-semibold ${labelColor ?? 'text-[#c8c8e0]'}`}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="text-[#9090b0] not-italic">
          {part.slice(1, -1)}
        </em>
      )
    }
    return part
  })
}

// Renders a source bullet: "Label text (https://url)" → label + clickable link
function renderSourceBullet(body: string, key: number): ReactNode {
  // Match trailing " (https://...)" — Gemini's typical source format
  const trailingUrl = body.match(/^(.*?)\s+\((https?:\/\/[^)]+)\)\s*$/)
  if (trailingUrl) {
    const [, label, href] = trailingUrl
    return (
      <div key={key} className="flex gap-2 text-[11.5px] leading-relaxed mb-1.5">
        <span className="text-[#3a3a55] shrink-0 select-none mt-0.5">·</span>
        <span className="text-[#666677]">
          {label && <span className="text-[#888899]">{label} — </span>}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00A3FF] hover:text-[#4dc0ff] underline decoration-dotted underline-offset-2 transition-colors"
          >
            {new URL(href).hostname.replace('www.', '')}
          </a>
        </span>
      </div>
    )
  }
  // Fallback: pass through renderInline (handles [text](url) and bare urls)
  return (
    <div key={key} className="flex gap-2 text-[11.5px] text-[#888899] leading-relaxed mb-1.5">
      <span className="text-[#3a3a55] shrink-0 select-none mt-0.5">·</span>
      <span>{renderInline(body, 'text-[#a8a8c8]')}</span>
    </div>
  )
}

function isLabelOnlyBullet(text: string): boolean {
  const trimmed = text.trim()
  return /^\*\*[^*]+\*\*:?\s*$/.test(trimmed)
}

export function renderBriefingMarkdown(content: string): ReactNode {
  const lines = content.split('\n')
  const elements: ReactNode[] = []
  let key = 0
  let inSourcesSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect the "Sources:" plain-text heading Gemini emits
    if (/^Sources:?\s*$/i.test(line.trim())) {
      inSourcesSection = true
      elements.push(
        <div key={key++} className="flex items-center gap-2 mt-7 mb-3">
          <span className="text-[14px] font-bold text-[#d0d0f0] tracking-tight leading-none">
            Sources
          </span>
          <span className="flex-1 h-px bg-[#1e1e30]" />
        </div>,
      )
      continue
    }

    // In the sources section, route all bullets through the source renderer
    if (inSourcesSection && line.startsWith('- ')) {
      elements.push(renderSourceBullet(line.slice(2), key++))
      continue
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h1
          key={key++}
          className="text-[20px] font-bold text-white tracking-tight mt-2 mb-5 first:mt-0"
        >
          {renderInline(line.slice(2), 'text-white')}
        </h1>,
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <div key={key++} className="flex items-center gap-2 mt-7 mb-3 first:mt-0">
          <span className="text-[14px] font-bold text-[#d0d0f0] tracking-tight leading-none">
            {line.slice(3)}
          </span>
          <span className="flex-1 h-px bg-[#1e1e30]" />
        </div>,
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={key++}
          className="text-[12px] font-semibold text-[#b8b8e0] mt-4 mb-2 uppercase tracking-wide"
        >
          {renderInline(line.slice(4), 'text-[#b8b8e0]')}
        </h3>,
      )
    } else if (line === '---') {
      void 0
    } else if (line.startsWith('  - ')) {
      const body = line.slice(4)
      elements.push(
        <div key={key++} className="flex gap-2 text-[12px] leading-relaxed mb-1.5 ml-5">
          <span className="text-[#3a3a55] shrink-0 select-none mt-[3px] text-[9px]">▸</span>
          <span className="text-[#7878a0]">{renderInline(body, 'text-[#a0a0cc]')}</span>
        </div>,
      )
    } else if (line.startsWith('- ')) {
      const body = line.slice(2)
      if (isLabelOnlyBullet(body)) {
        elements.push(
          <div key={key++} className="flex items-center gap-2 mt-4 mb-1.5 first:mt-0">
            <span className="text-[12px] font-semibold text-[#b8b8e0]">
              {body.replace(/\*\*/g, '').replace(/:$/, '')}
            </span>
            <span className="flex-1 h-px bg-[#161624]" />
          </div>,
        )
      } else {
        elements.push(
          <div
            key={key++}
            className="flex gap-2 text-[12px] text-[#888899] leading-relaxed mb-1.5"
          >
            <span className="text-[#3a3a55] shrink-0 select-none mt-0.5">·</span>
            <span>{renderInline(body, 'text-[#a8a8c8]')}</span>
          </div>,
        )
      }
    } else if (line.startsWith('> ')) {
      elements.push(
        <div
          key={key++}
          className="border-l-2 border-[#3a3a5e] pl-4 my-3 bg-[#0c0c1a] py-2 rounded-r"
        >
          <p className="text-[13px] italic text-[#8080a8] leading-relaxed">
            {renderInline(line.slice(2), 'text-[#a0a0c8]')}
          </p>
        </div>,
      )
    } else if (line.trim() === '') {
      if (i > 0 && lines[i - 1].trim() !== '') {
        elements.push(<div key={key++} className="h-1" />)
      }
    } else {
      elements.push(
        <p key={key++} className="text-[11.5px] text-[#666677] leading-relaxed mb-1 italic">
          {renderInline(line)}
        </p>,
      )
    }
  }

  return <>{elements}</>
}
