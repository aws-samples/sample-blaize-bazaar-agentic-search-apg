/**
 * Agent Reasoning Traces - Visual Agent Workflow Monitor
 * 
 * Real-time visualization of multi-agent reasoning, tool calls, and decision flow.
 * Shows orchestrator routing, specialist agent execution, and tool invocations.
 */
import { useState, useEffect } from 'react';
import { X, Brain, Zap, Database, CheckCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react';

interface AgentStep {
  id: string;
  agent: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  timestamp: number;
  duration_ms?: number;
  tool_calls?: ToolCall[];
  result?: string;
}

interface ToolCall {
  tool: string;
  params: Record<string, any>;
  result?: any;
  duration_ms?: number;
}

interface AgentReasoningTracesProps {
  isOpen: boolean;
  onClose: () => void;
}

const AgentReasoningTraces = ({ isOpen, onClose }: AgentReasoningTracesProps) => {
  const [traces, setTraces] = useState<AgentStep[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<'demo' | 'live'>('demo');

  // Listen for complete agent execution from chat
  useEffect(() => {
    const handleAgentExecution = (event: CustomEvent) => {
      console.log('📥 Received agent-execution-complete event:', event.detail);
      const { agent_steps, tool_calls, trace_id, otel_enabled } = event.detail;
      
      // Log OTEL trace info if available
      if (otel_enabled && trace_id) {
        console.log('✨ OpenTelemetry trace_id:', trace_id);
      }
      
      if (!agent_steps || agent_steps.length === 0) {
        console.log('⚠️ No agent steps in event');
        return;
      }
      
      // Convert agent steps to our format
      const steps: AgentStep[] = agent_steps.map((step: any, idx: number) => ({
        id: `${Date.now()}-${idx}`,
        agent: step.agent,
        action: step.action,
        status: 'completed',
        timestamp: step.timestamp,
        duration_ms: step.duration_ms,
        tool_calls: idx === agent_steps.length - 1 ? tool_calls?.map((tc: any) => ({
          tool: tc.tool,
          params: { tool: tc.tool },
          duration_ms: tc.duration_ms
        })) : undefined
      }));
      
      console.log('✅ Setting traces:', steps);
      setTraces(steps);
      setMode('live');
    };

    console.log('🎧 Agent Reasoning Traces: Event listener registered');
    window.addEventListener('agent-execution-complete' as any, handleAgentExecution);
    return () => {
      console.log('🔇 Agent Reasoning Traces: Event listener removed');
      window.removeEventListener('agent-execution-complete' as any, handleAgentExecution);
    };
  }, []);

  // Mock agent execution for demo
  const simulateAgentExecution = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsRecording(true);
    setTraces([]);

    const steps: AgentStep[] = [
      {
        id: '1',
        agent: 'Orchestrator',
        action: 'Analyzing user query and routing to specialists',
        status: 'in_progress',
        timestamp: Date.now(),
      },
      {
        id: '2',
        agent: 'Orchestrator',
        action: 'Query classified as product search → Routing to Search Agent',
        status: 'pending',
        timestamp: Date.now() + 500,
      },
      {
        id: '3',
        agent: 'Search Agent',
        action: 'Generating semantic embedding for query',
        status: 'pending',
        timestamp: Date.now() + 1000,
        tool_calls: [
          {
            tool: 'generate_embedding',
            params: { query: 'wireless headphones' },
          },
        ],
      },
      {
        id: '4',
        agent: 'Search Agent',
        action: 'Executing pgvector similarity search',
        status: 'pending',
        timestamp: Date.now() + 1500,
        tool_calls: [
          {
            tool: 'semantic_product_search',
            params: { limit: 10, ef_search: 40 },
          },
        ],
      },
      {
        id: '5',
        agent: 'Search Agent',
        action: 'Found 10 matching products',
        status: 'pending',
        timestamp: Date.now() + 2000,
        result: '10 products with avg similarity 0.87',
      },
      {
        id: '6',
        agent: 'Orchestrator',
        action: 'Synthesizing final response',
        status: 'pending',
        timestamp: Date.now() + 2500,
      },
    ];

    // Animate steps
    steps.forEach((step, index) => {
      setTimeout(() => {
        setTraces((prev) => {
          const updated = [...prev];
          if (index > 0) {
            updated[index - 1] = { ...updated[index - 1], status: 'completed', duration_ms: 450 };
          }
          return [...updated, { ...step, status: index === 0 ? 'in_progress' : 'pending' }];
        });

        if (index === steps.length - 1) {
          setTimeout(() => {
            setTraces((prev) => {
              const final = [...prev];
              final[final.length - 1] = { ...final[final.length - 1], status: 'completed', duration_ms: 320 };
              return final;
            });
            setIsRecording(false);
          }, 500);
        }
      }, index * 600);
    });
  };

  const getStatusIcon = (status: AgentStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-400 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-600" />;
    }
  };

  const getAgentGradient = (agent: string) => {
    if (agent === 'Orchestrator') return 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)';
    if (agent === 'Search Agent') return 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)';
    if (agent === 'Inventory Agent') return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    if (agent === 'Pricing Agent') return 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)';
    return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      <div
        className="w-[900px] max-h-[85vh] rounded-2xl shadow-2xl border overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%)',
          borderColor: 'rgba(139, 92, 246, 0.3)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
            borderColor: 'rgba(139, 92, 246, 0.2)',
          }}
        >
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Agent Reasoning Traces</h2>
              <p className="text-xs text-text-secondary">Real-time multi-agent workflow visualization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-purple-500/20 transition-colors"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => simulateAgentExecution(e)}
                  disabled={isRecording}
                  className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isRecording
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)'
                      : 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                    color: 'white',
                  }}
                >
                  {isRecording ? 'Recording...' : 'Simulate Agent Query'}
                </button>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-text-secondary">
                    {mode === 'live' ? '🔴 Live Mode' : '🟢 Demo Mode'}
                  </div>
                  <div className="text-xs text-text-secondary">
                    💡 Use AI Assistant to see live traces
                  </div>
                </div>
              </div>
              {traces.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTraces([])}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Clear Traces
                </button>
              )}
            </div>

          </div>

          {/* Traces Timeline */}
          {traces.length === 0 ? (
            <div className="text-center py-16">
              <Brain className="h-16 w-16 text-purple-400/30 mx-auto mb-4" />
              <p className="text-text-secondary">No agent traces yet. Click "Simulate Agent Query" to see the workflow.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {traces.map((step, index) => (
                <div key={step.id} className="relative">
                  {/* Connection Line */}
                  {index < traces.length - 1 && (
                    <div
                      className="absolute left-6 top-12 w-0.5 h-8 bg-gradient-to-b from-purple-500/50 to-transparent"
                      style={{ zIndex: 0 }}
                    />
                  )}

                  {/* Step Card */}
                  <div
                    className="relative rounded-xl border p-4 transition-all"
                    style={{
                      background:
                        step.status === 'in_progress'
                          ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)'
                          : 'rgba(31, 41, 55, 0.5)',
                      borderColor:
                        step.status === 'in_progress'
                          ? 'rgba(139, 92, 246, 0.5)'
                          : step.status === 'completed'
                          ? 'rgba(34, 197, 94, 0.3)'
                          : 'rgba(75, 85, 99, 0.3)',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className="mt-1">{getStatusIcon(step.status)}</div>

                      {/* Content */}
                      <div className="flex-1">
                        {/* Agent Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="px-3 py-1 rounded-full text-xs font-medium text-white"
                            style={{
                              background: getAgentGradient(step.agent),
                            }}
                          >
                            {step.agent}
                          </div>
                          {step.duration_ms && (
                            <span className="text-xs text-text-secondary">
                              {step.duration_ms}ms
                            </span>
                          )}
                        </div>

                        {/* Action */}
                        <p className="text-sm text-text-primary mb-2">{step.action}</p>

                        {/* Tool Calls */}
                        {step.tool_calls && step.tool_calls.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs font-medium text-purple-300 mb-2">🔧 Tool Calls</div>
                            {step.tool_calls.map((tool, toolIndex) => (
                              <div
                                key={toolIndex}
                                className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20"
                              >
                                <Database className="h-3 w-3 text-purple-400" />
                                <span className="text-xs font-mono text-purple-300">{tool.tool}</span>
                                {tool.duration_ms && (
                                  <>
                                    <ArrowRight className="h-3 w-3 text-gray-500" />
                                    <span className="text-xs text-green-400">{tool.duration_ms}ms</span>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Result */}
                        {step.result && (
                          <div className="mt-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center gap-2">
                              <Zap className="h-3 w-3 text-green-400" />
                              <span className="text-xs text-green-300">{step.result}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t"
          style={{
            background: 'rgba(17, 24, 39, 0.8)',
            borderColor: 'rgba(75, 85, 99, 0.3)',
          }}
        >
          <p className="text-xs text-text-secondary">
            <strong className="text-purple-300">Agent Reasoning:</strong> Visualizes orchestrator routing, 
            specialist agent execution, and tool invocations in real-time. Powered by <strong>Strands OpenTelemetry</strong> 
            with automatic trace capture. View full traces in console or export to CloudWatch X-Ray/Jaeger for production observability.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentReasoningTraces;
