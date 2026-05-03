/**
 * RuntimeDetail — Architecture detail page for Runtime.
 *
 * AgentCore execution environment — model invocation, tool orchestration,
 * memory access, and observability hooks.
 *
 * Requirements: 7.1, 7.6, 7.7
 */

import React from 'react';
import DetailPageShell from './DetailPageShell';
import { ExpCard } from '../../../components';
import { useAtelierData } from '../../../hooks/useAtelierData';
import type { ArchitectureConcept } from '../../../types';
import { DetailLoadingState, DetailErrorState, DetailEmptyState } from './DetailStates';

const RuntimeDetail: React.FC = () => {
  const { data, loading, error, refetch } = useAtelierData<ArchitectureConcept[]>({
    key: 'architecture',
  });

  const concept = data?.find((c) => c.slug === 'runtime');

  return (
    <DetailPageShell
      numeral="VI"
      conceptName="Runtime"
      category="managed"
      title="Runtime, managed."
      prose="AgentCore Runtime provides the execution environment for all agents — model invocation, tool orchestration, memory access, and observability hooks. It manages the lifecycle from intent classification through response composition."
      cheatSheet={[
        {
          numeral: 'i.',
          text: 'The Runtime is the execution environment. It manages agent lifecycle, model invocation, and tool orchestration in a single managed surface.',
        },
        {
          numeral: 'ii.',
          text: 'Memory access, gateway routing, and telemetry export are all wired through the Runtime. You configure, the platform operates.',
        },
        {
          numeral: 'iii.',
          text: 'The Runtime handles cold starts, connection pooling, and model routing. Your code focuses on agent logic, not infrastructure.',
        },
      ]}
      liveState={{
        label: 'Current AgentCore Runtime state. Shows the execution environment configuration and active services.',
        values: [
          { label: 'Agents', value: '5' },
          { label: 'Memory', value: 'Active' },
          { label: 'Gateway', value: 'MCP' },
        ],
      }}
    >
      {loading && <DetailLoadingState />}
      {error && <DetailErrorState message={error} onRetry={refetch} />}
      {!loading && !error && !concept && <DetailEmptyState conceptName="Runtime" />}
      {!loading && !error && concept && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Runtime layers */}
          <ExpCard>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <SectionLabel label="The layers" />
              <h3 style={titleStyle}>Seven layers, one request.</h3>
              <p style={proseStyle}>
                A request flows through seven layers: fast-path check, intent classification,
                skill routing, orchestrator dispatch, specialist execution, tool invocation,
                and response streaming. The Runtime manages all of them.
              </p>
              <RuntimeLayersDiagram />
            </div>
          </ExpCard>

          {/* Layer cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <LayerCard
              name="Fast-path"
              timing="~5ms"
              description="Quick check for cached responses or simple queries that don't need agent reasoning."
            />
            <LayerCard
              name="Intent classification"
              timing="~120ms"
              description="Haiku 4.5 classifies the user's intent: pricing, inventory, support, search, or recommendation."
            />
            <LayerCard
              name="Skill routing"
              timing="~120ms"
              description="SkillRouter evaluates whether to inject style-advisor or gift-concierge for this turn."
            />
            <LayerCard
              name="Specialist execution"
              timing="~800ms"
              description="Opus 4.6 specialists compose the response using STM context, LTM recall, and tool results."
            />
          </div>

          {/* Code snippet */}
          <ExpCard>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <SectionLabel label="Code" />
              <pre style={codeStyle}>{concept.codeSnippet}</pre>
            </div>
          </ExpCard>
        </div>
      )}
    </DetailPageShell>
  );
};

/* ---- Sub-components ---- */

const LayerCard: React.FC<{
  name: string;
  timing: string;
  description: string;
}> = ({ name, timing, description }) => (
  <ExpCard>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span style={{ fontFamily: 'var(--at-serif)', fontStyle: 'italic', fontSize: '16px', color: 'var(--at-ink-1)' }}>
          {name}
        </span>
        <span style={{ fontFamily: 'var(--at-mono)', fontSize: '11px', color: 'var(--at-ink-4)' }}>
          {timing}
        </span>
      </div>
      <p style={{ fontFamily: 'var(--at-sans)', fontSize: '15px', lineHeight: 1.5, color: 'var(--at-ink-1)', margin: 0 }}>
        {description}
      </p>
    </div>
  </ExpCard>
);

const RuntimeLayersDiagram: React.FC = () => (
  <svg viewBox="0 0 500 160" width="100%" style={{ maxWidth: '500px', display: 'block', margin: '0 auto' }}>
    {/* Layer bars stacked */}
    {[
      { label: 'fast-path', width: 30, color: 'rgba(107,140,94,0.3)' },
      { label: 'intent', width: 80, color: 'rgba(168,66,58,0.2)' },
      { label: 'skill-router', width: 80, color: 'rgba(168,66,58,0.15)' },
      { label: 'orchestrator', width: 150, color: 'rgba(31,20,16,0.12)' },
      { label: 'specialist', width: 280, color: 'rgba(31,20,16,0.08)' },
      { label: 'tools', width: 200, color: 'rgba(168,66,58,0.1)' },
      { label: 'stream', width: 400, color: 'rgba(107,140,94,0.15)' },
    ].map((layer, i) => (
      <g key={layer.label}>
        <rect x="80" y={10 + i * 20} width={layer.width} height="16" rx="4" fill={layer.color} />
        <text x="70" y={22 + i * 20} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="rgba(31,20,16,0.5)" letterSpacing="0.5">
          {layer.label}
        </text>
      </g>
    ))}
    {/* Time axis */}
    <line x1="80" y1="155" x2="480" y2="155" stroke="rgba(31,20,16,0.15)" strokeWidth="0.5" />
    <text x="280" y="152" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="rgba(31,20,16,0.35)" letterSpacing="1.5">TIME →</text>
  </svg>
);

/* ---- Shared styles ---- */

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <span style={{ fontFamily: 'var(--at-mono)', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--at-ink-4)', fontWeight: 500 }}>
    {label}
  </span>
);

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--at-serif)', fontSize: '22px', fontWeight: 400, fontStyle: 'italic',
  lineHeight: 1.15, color: 'var(--at-ink-1)', margin: 0,
};

const proseStyle: React.CSSProperties = {
  fontFamily: 'var(--at-sans)', fontSize: 'var(--at-body-size)', lineHeight: 'var(--at-body-leading)',
  color: 'var(--at-ink-1)', margin: 0, maxWidth: '560px',
};

const codeStyle: React.CSSProperties = {
  fontFamily: 'var(--at-mono)', fontSize: '15px', lineHeight: 1.7,
  color: 'var(--at-ink-1)', backgroundColor: 'var(--at-cream-2)', borderRadius: '8px',
  padding: '14px 16px', margin: 0, overflowX: 'auto', whiteSpace: 'pre',
};

export default RuntimeDetail;
