// Output schema definition for the dataset

export interface RadarResult {
    id: string;
    token: string;
    tokenAddress: string;
    chain: string;
    timestamp: number; // Unix timestamp in milliseconds
    radarScore: number; // 0-100
    pattern: string | null;
    signals: {
        momentum: {
            value: number | null;
            available: boolean;
            source: string;
            timestamp: number;
            metadata?: Record<string, unknown>;
        };
        liquidity: {
            value: number | null;
            available: boolean;
            source: string;
            timestamp: number;
            metadata?: Record<string, unknown>;
        };
        holders: {
            value: number | null;
            available: boolean;
            source: string;
            timestamp: number;
            metadata?: Record<string, unknown>;
        };
        walletFlow: {
            value: number | null;
            available: boolean;
            source: string;
            timestamp: number;
            metadata?: Record<string, unknown>;
        };
        attention: {
            value: number | null;
            available: boolean;
            source: string;
            timestamp: number;
            metadata?: Record<string, unknown>;
        };
    };
    evidence: {
        description: string;
        contributingSignals: ('momentum' | 'liquidity' | 'holders' | 'walletFlow' | 'attention')[];
        signalValues: Record<string, number>;
    }[];
    riskFlags: {
        type: string;
        severity: 'low' | 'medium' | 'high';
        description: string;
        signal: 'momentum' | 'liquidity' | 'holders' | 'walletFlow' | 'attention';
    }[];
    sourceData: Record<string, unknown>;
    discoveredAt: number; // When this result was generated
}
