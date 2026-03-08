/**
 * Context Dashboard - Visual Token & Prompt Management
 * 
 * Production-grade UI for monitoring context window usage, prompt versions,
 * and cost optimization in real-time.
 * 
 * Features:
 * - Token usage meter with 200K context window visualization
 * - Prompt version tracker showing active versions
 * - Real-time cost estimator based on token usage
 * - Performance metrics and efficiency scores
 */
import { useState, useEffect } from 'react';
import { Activity, Zap, DollarSign, Clock, TrendingUp, Code, AlertTriangle } from 'lucide-react';

interface ContextStats {
  window_size: number;
  current_tokens: number;
  usage_percentage: number;
  available_tokens: number;
  total_messages: number;
  system_prompt_tokens: number;
  session_duration_minutes: number;
  total_tokens_processed: number;
  pruning_events: number;
  avg_tokens_per_message: number;
  estimated_cost_usd: number;
  efficiency_score: number;
}

interface PromptVersion {
  agent: string;
  version: string;
  performance: {
    avg_response_time_ms: number;
    success_rate: number;
  };
}

interface ContextDashboardProps {
  sessionId?: string;
  onClose?: () => void;
}

const ContextDashboard = ({ sessionId, onClose }: ContextDashboardProps) => {
  const [stats, setStats] = useState<ContextStats | null>(null);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [showDetails] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Fetch context stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/context/stats${sessionId ? `?session_id=${sessionId}` : ''}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch context stats:', error);
      }
    };

    const fetchPrompts = async () => {
      try {
        const response = await fetch('/api/context/prompts');
        if (response.ok) {
          const data = await response.json();
          setPromptVersions(data.prompts || []);
        }
      } catch (error) {
        console.error('Failed to fetch prompts:', error);
      }
    };

    fetchStats();
    fetchPrompts();
    const interval = setInterval(fetchStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [sessionId]);

  if (!stats) {
    return (
      <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <div className="flex items-center gap-2 text-text-secondary">
          <Activity className="h-4 w-4 animate-pulse" />
          <span className="text-sm">Loading Context Stats...</span>
        </div>
      </div>
    );
  }

  const getUsageColor = (percentage: number): string => {
    if (percentage < 60) return 'bg-green-500';
    if (percentage < 85) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getEfficiencyColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-text-primary">Context Monitor</h3>
          <span className="text-xs text-text-secondary">Real-time</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-xs px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '□' : '−'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-red-500/20 text-purple-300 hover:text-red-300 transition-colors"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Minimized View */}
      {isMinimized && (
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Tokens:</span>
            <span className="text-purple-400 font-bold">{stats.current_tokens.toLocaleString()} / 200K</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-text-secondary">Cost:</span>
            <span className="text-yellow-400 font-bold">${stats.estimated_cost_usd.toFixed(4)}</span>
          </div>
        </div>
      )}

      {/* Full View */}
      {!isMinimized && (
        <>
      {/* Token Usage Meter - Primary */}
      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-text-primary">Context Window Usage</span>
          </div>
          <span className="text-lg font-bold text-purple-400">
            {stats.current_tokens.toLocaleString()} / 200K
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="relative h-3 bg-purple-500/10 rounded-full overflow-hidden">
          <div
            className={`absolute h-full ${getUsageColor(stats.usage_percentage)} transition-all duration-500 rounded-full`}
            style={{ width: `${Math.min(100, stats.usage_percentage)}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-text-secondary">
          <span>{stats.usage_percentage.toFixed(1)}% used</span>
          <span>{stats.available_tokens.toLocaleString()} tokens available</span>
        </div>

        {/* Warning if approaching limit */}
        {stats.usage_percentage > 85 && (
          <div className="mt-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-300">
              Approaching context limit. Auto-pruning will activate at 85% to maintain performance.
            </p>
          </div>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Messages */}
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3 w-3 text-blue-400" />
            <span className="text-xs text-text-secondary">Messages</span>
          </div>
          <div className="text-lg font-bold text-blue-400">{stats.total_messages}</div>
          <div className="text-xs text-text-secondary mt-1 truncate">
            ~{stats.avg_tokens_per_message.toFixed(0)} tok/msg
          </div>
        </div>

        {/* Efficiency Score */}
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 group relative">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3 w-3 text-green-400" />
            <span className="text-xs text-text-secondary">Efficiency</span>
          </div>
          <div className={`text-lg font-bold ${getEfficiencyColor(stats.efficiency_score)}`}>
            {stats.efficiency_score.toFixed(0)}%
          </div>
          <div className="text-xs text-text-secondary mt-1 truncate">
            {stats.pruning_events} prunes
          </div>
          <div className="absolute left-0 bottom-full mb-2 w-56 p-2 rounded-lg bg-green-900/95 border border-green-500/30 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            <p className="text-xs text-green-100 leading-relaxed">
              <strong>Efficiency Score:</strong> Measures token utilization (40%), pruning efficiency (30%), and recency (30%). Higher is better. 80%+ is excellent.
            </p>
          </div>
        </div>

        {/* Cost */}
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 group relative">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-3 w-3 text-yellow-400" />
            <span className="text-xs text-text-secondary">Cost</span>
          </div>
          <div className="text-lg font-bold text-yellow-400 truncate">
            ${stats.estimated_cost_usd.toFixed(4)}
          </div>
          <div className="text-xs text-text-secondary mt-1 truncate">
            Input tokens
          </div>
          <div className="absolute left-0 bottom-full mb-2 w-56 p-2 rounded-lg bg-yellow-900/95 border border-yellow-500/30 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            <p className="text-xs text-yellow-100 leading-relaxed">
              <strong>Cost Calculation:</strong> Claude Sonnet 4 charges $3.00 per 1M input tokens. Formula: (tokens / 1,000,000) × $3.00
            </p>
          </div>
        </div>

        {/* Session Duration */}
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3 w-3 text-purple-400" />
            <span className="text-xs text-text-secondary">Duration</span>
          </div>
          <div className="text-lg font-bold text-purple-400">
            {stats.session_duration_minutes.toFixed(0)}m
          </div>
          <div className="text-xs text-text-secondary mt-1 truncate">
            Active session
          </div>
        </div>
      </div>
        </>
      )}

      {/* Prompt Versions - Compact */}
      {!isMinimized && promptVersions.length > 0 && (
        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-text-primary">Active Prompt Versions</span>
            </div>
            <div className="group relative">
              <button className="text-xs text-purple-400 hover:text-purple-300">info</button>
              <div className="absolute right-0 top-6 w-64 p-3 rounded-lg bg-purple-900/95 border border-purple-500/30 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <p className="text-xs text-purple-100 mb-2 font-semibold">Extend Prompts:</p>
                <p className="text-xs text-purple-200 leading-relaxed">
                  Edit prompts in <code className="bg-purple-800/50 px-1 rounded">backend/services/context_manager.py</code> under PromptRegistry.TEMPLATES. Update version numbers for A/B testing and track performance metrics.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {promptVersions.map((prompt) => (
              <div key={prompt.agent} className="p-2 rounded-lg bg-purple-500/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-text-primary truncate flex-1">{prompt.agent}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 ml-2">
                    {prompt.version}
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-text-secondary">
                  <span className="truncate">{prompt.performance.avg_response_time_ms}ms</span>
                  <span className="truncate">{(prompt.performance.success_rate * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Stats (Collapsible) */}
      {showDetails && (
        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3">
          <h4 className="text-sm font-medium text-text-primary mb-2">Detailed Metrics</h4>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">Window Size:</span>
              <span className="text-text-primary font-mono">{stats.window_size.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Current Tokens:</span>
              <span className="text-text-primary font-mono">{stats.current_tokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">System Prompt:</span>
              <span className="text-text-primary font-mono">{stats.system_prompt_tokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Total Processed:</span>
              <span className="text-text-primary font-mono">{stats.total_tokens_processed.toLocaleString()}</span>
            </div>
          </div>

          {/* Context Management Info */}
          <div className="pt-3 border-t border-purple-500/20">
            <p className="text-xs text-text-secondary leading-relaxed">
              <strong className="text-purple-300">Context Management:</strong> Automatically prunes 
              low-importance messages when reaching 85% capacity. System prompts and recent messages 
              are always preserved. Current efficiency score of {stats.efficiency_score.toFixed(0)}% 
              indicates {stats.efficiency_score >= 80 ? 'excellent' : stats.efficiency_score >= 60 ? 'good' : 'moderate'} token utilization.
            </p>
          </div>
        </div>
      )}

      {/* Educational Note */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-start gap-2">
          <Zap className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-text-secondary">
            <strong className="text-blue-300">Context Management:</strong> This dashboard 
            demonstrates enterprise-grade context window management for Claude Sonnet 4's 200K token 
            limit. Token budgeting, intelligent pruning, and cost optimization are critical for 
            multi-agent systems at scale.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextDashboard;
