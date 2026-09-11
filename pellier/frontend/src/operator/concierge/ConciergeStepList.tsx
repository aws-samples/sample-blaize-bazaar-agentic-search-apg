import React from 'react'
import {
  AlertCircle,
  Check,
  Database,
  LoaderCircle,
  MessageSquareQuote,
  ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { ConciergeInvestigationStep } from '../../services/operatorConcierge'
import ServiceLogo, { type ServiceName } from '../components/ServiceLogo'

interface Props {
  steps: ConciergeInvestigationStep[]
}

function sourceIdentity(source: string): {
  Icon: LucideIcon
  service?: ServiceName
  tone:
    | 'database'
    | 'memory'
    | 'model'
    | 'control'
    | 'graph'
    | 'handoff'
    | 'neutral'
} {
  const value = source.toLowerCase()
  if (value.includes('aurora')) {
    return { Icon: Database, service: 'aurora', tone: 'database' }
  }
  if (value.includes('postgres')) return { Icon: Database, tone: 'database' }
  if (value.includes('memory')) return { Icon: Database, service: 'agentcore', tone: 'memory' }
  if (value.includes('strands')) return { Icon: Database, service: 'strands', tone: 'graph' }
  if (value.includes('storefront handoff')) {
    return { Icon: MessageSquareQuote, tone: 'handoff' }
  }
  if (value.includes('control') || value.includes('policy')) {
    return { Icon: ShieldCheck, service: value.includes('agentcore') ? 'agentcore' : undefined, tone: 'control' }
  }
  if (value.includes('agentcore')) return { Icon: Database, service: 'agentcore', tone: 'control' }
  if (value.includes('bedrock')) return { Icon: Database, service: 'bedrock', tone: 'model' }
  return { Icon: Database, tone: 'neutral' }
}

function statusIcon(step: ConciergeInvestigationStep): LucideIcon {
  if (step.status === 'running') return LoaderCircle
  if (step.status === 'failed' || step.status === 'unavailable') return AlertCircle
  return Check
}

function durationLabel(durationMs?: number | null): string {
  if (durationMs == null) return ''
  if (durationMs < 1000) return `${durationMs}ms`
  return `${(durationMs / 1000).toFixed(1)}s`
}

function statusLabel(status: ConciergeInvestigationStep['status']): string {
  if (status === 'running') return 'Running'
  if (status === 'failed') return 'Failed'
  if (status === 'unavailable') return 'Unavailable'
  return 'Completed'
}

const ConciergeStepList: React.FC<Props> = ({ steps }) => (
  <ol className="operator-concierge-steps">
    {steps.map((step, index) => {
      const { Icon: SourceIcon, service, tone } = sourceIdentity(step.source)
      const StatusIcon = statusIcon(step)
      const duration = durationLabel(step.durationMs)
      return (
        <li
          className="operator-concierge-step"
          key={`${step.kind}-${index}`}
          data-step-status={step.status}
          data-source-tone={tone}
        >
          <span className="operator-concierge-step-status" aria-hidden="true">
            <StatusIcon size={14} strokeWidth={1.8} />
          </span>
          <span className="sr-only">Status: {statusLabel(step.status)}</span>
          <span className="operator-concierge-step-copy">
            <span className="operator-concierge-step-label">{step.label}</span>
            {step.result ? (
              <span className="operator-concierge-step-result">{step.result}</span>
            ) : null}
          </span>
          <span className="operator-concierge-step-provenance">
            <span className="operator-concierge-step-source">
              {service ? (
                <ServiceLogo service={service} />
              ) : (
                <SourceIcon size={16} strokeWidth={1.8} aria-hidden="true" />
              )}
              {step.source}
            </span>
            {duration ? (
              <span className="operator-concierge-step-duration">{duration}</span>
            ) : null}
          </span>
        </li>
      )
    })}
  </ol>
)

export default ConciergeStepList
