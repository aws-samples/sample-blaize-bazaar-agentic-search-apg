/**
 * UserMessage — right-aligned ink bubble with asymmetric corners.
 *
 * Matches the editorial chat mockup: ink bg, cream text, 14px padding,
 * max-width 80%, right-aligned. Border-radius 14/14/4/14 gives it the
 * squared bottom-right corner.
 */

const INK = '#2d1810'
const CREAM = '#fbf4e8'

export interface UserMessageProps {
  text: string
}

export default function UserMessage({ text }: UserMessageProps) {
  return (
    <div
      data-testid="user-message"
      className="flex justify-end mb-4"
    >
      <div
        className="max-w-[80%] text-[14px] px-[14px] py-[10px]"
        style={{
          background: INK,
          color: CREAM,
          borderRadius: '14px 14px 4px 14px',
        }}
      >
        {text}
      </div>
    </div>
  )
}
