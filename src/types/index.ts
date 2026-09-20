// Core types for Degen Radar

export interface SignalValue {
  value: number | null;
  timestamp: number; // Unix timestamp in milliseconds
  source: string;
  available: boolean;
  metadata?: Record<string, unknown>;
}

export interface Signals {
  momentum: SignalValue;
  liquidity: SignalValue;
  holders: SignalValue;
  walletFlow: SignalValue;
  attention: SignalValue;
}

export interface PatternEvidence {
  description: string;
  contributingSignals: (keyof Signals)[];
  signalValues: Partial<Record<keyof Signals, number>>;
}

export interface RiskFlag {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  signal: keyof Signals;
}

export interface RadarResult {
  id: string;
  token: string;
  tokenAddress: string;
  chain: string;
  timestamp: number; // Unix timestamp in milliseconds
  radarScore: number; // 0-100
  pattern: string | null;
  signals: Signals;
  evidence: PatternEvidence[];
  riskFlags: RiskFlag[];
  sourceData: Record<string, unknown>;
  discoveredAt: number; // When this result was generated
}

export interface ActorInput {
  tokenAddresses: string[]; // Solana token addresses to analyze
  maxTokens?: number; // Maximum number of tokens to process
  observationWindowHours?: number; // Hours to look back for signal calculation
  minLiquidityThreshold?: number; // Minimum liquidity threshold (USD)
  minSignalAvailability?: number; // Minimum percentage of signals that must be available (0-1)
  enabledSignalCategories?: ('momentum' | 'liquidity' | 'holders' | 'walletFlow' | 'attention')[];
  trackedWalletAddresses?: string[]; // Optional wallet addresses to track for flow
  attentionSources?: ('twitter' | 'reddit' | 'telegram' | 'news')[]; // Attention sources to monitor
}