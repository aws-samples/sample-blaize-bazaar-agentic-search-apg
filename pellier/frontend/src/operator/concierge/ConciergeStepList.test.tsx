import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ConciergeStepList from './ConciergeStepList'

describe('ConciergeStepList', () => {
  it('names a step status for assistive technology instead of relying on its icon', () => {
    render(
      <ConciergeStepList
        steps={[
          {
            kind: 'case_investigator',
            label: 'Investigate the client case',
            source: 'Strands Graph',
            status: 'failed',
            result: 'The evidence source was unavailable.',
          },
        ]}
      />,
    )

    expect(screen.getByText('Status: Failed')).toHaveClass('sr-only')
  })

  it('uses the supplied service marks while retaining source names and step status', () => {
    const sources = ['Aurora PostgreSQL', 'AgentCore Memory', 'Amazon Bedrock', 'Strands Graph']
    const { container } = render(<ConciergeStepList steps={sources.map((source) => ({
      kind: source, label: 'Read context', source, status: 'complete' as const,
    }))} />)
    const paths = Array.from(container.querySelectorAll('img')).map((image) =>
      image.getAttribute('src'),
    )
    expect(paths).toEqual([
      '/assets/icons/aws/amazon-aurora.svg',
      '/assets/icons/aws/amazon-bedrock-agentcore.svg',
      '/assets/icons/aws/amazon-bedrock.svg',
      '/services/strands.png',
    ])
    for (const source of sources) expect(screen.getByText(source)).toBeInTheDocument()
    expect(screen.getAllByText('Status: Completed')).toHaveLength(4)
  })

  it('does not label a local PostgreSQL read with the Aurora service mark', () => {
    const { container } = render(<ConciergeStepList steps={[{
      kind: 'database', label: 'Read context', source: 'Local PostgreSQL', status: 'complete',
    }]} />)
    expect(container.querySelector('img')).toBeNull()
  })
})
