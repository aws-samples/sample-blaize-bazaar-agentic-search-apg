/**
 * Markdown Message Renderer - Formats agent responses with markdown
 */

interface Props {
  content: string
}

const MarkdownMessage = ({ content }: Props) => {

  const renderContent = (raw: string) => {
    // Pre-clean: strip artifacts the backend should have removed
    let text = raw
      // Remove code blocks (```json ... ``` or ``` ... ```)
      .replace(/```[\s\S]*?```/g, '')
      // Remove markdown table rows (| col | col |)
      .replace(/^\|.*$/gm, '')
      // Remove horizontal rules (---, ***, ___)
      .replace(/^[-*_]{3,}\s*$/gm, '')
      // Remove header-style section labels (### Highlights, ## Summary)
      .replace(/^#{1,4}\s+.*$/gm, '')
      // Remove "Products:" / "Suggestions:" labels
      .replace(/^(?:Products?|Suggestions?):?\s*$/gim, '')
      // Collapse blank lines
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const lines = text.split('\n')
    const elements: JSX.Element[] = []
    let currentList: string[] = []
    let listKey = 0

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${listKey++}`} className="list-disc list-inside space-y-1 my-2 ml-4">
            {currentList.map((item, idx) => (
              <li key={idx} className="text-text-primary">{formatText(item)}</li>
            ))}
          </ul>
        )
        currentList = []
      }
    }

    const formatText = (text: string) => {
      // Replace stars with gold colored stars
      const parts = text.split(/(\d+\.\d+★)/)
      return parts.map((part, i) => {
        if (part.match(/\d+\.\d+★/)) {
          return <span key={i} className="text-yellow-500 font-semibold">{part}</span>
        }
        // Handle inline bold
        const boldParts = part.split(/(\*\*.*?\*\*)/)
        return boldParts.map((bp, j) => {
          if (bp.startsWith('**') && bp.endsWith('**')) {
            return <strong key={`${i}-${j}`} className="font-semibold">{bp.slice(2, -2)}</strong>
          }
          return <span key={`${i}-${j}`}>{bp}</span>
        })
      })
    }

    lines.forEach((line, idx) => {
      // Bold text with emoji
      if (line.match(/^\*\*.*\*\*/)) {
        flushList()
        const text = line.replace(/\*\*/g, '')
        elements.push(
          <p key={idx} className="font-semibold text-text-primary my-2">
            {formatText(text)}
          </p>
        )
      }
      // List items (- or •)
      else if (line.match(/^[-•]\s/)) {
        const text = line.replace(/^[-•]\s*/, '').replace(/\*\*/g, '')
        currentList.push(text)
      }
      // Regular paragraphs (skip empty/whitespace-only)
      else if (line.trim()) {
        flushList()
        elements.push(
          <p key={idx} className="text-text-primary my-2">
            {formatText(line)}
          </p>
        )
      }
      // Empty lines
      else {
        flushList()
      }
    })

    flushList()
    return elements
  }

  return (
    <div className="space-y-1">
      {renderContent(content)}
    </div>
  )
}

export default MarkdownMessage
