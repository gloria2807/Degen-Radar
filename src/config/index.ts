// Configuration for Degen Radar

export const CONFIG = {
    // Solana RPC endpoint (public, can be overridden)
    SOLANA_RPC: process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',

    // API endpoints for data sources
    COINGECKO_API: 'https://api.coingecko.com/api/v3',
    BIRDEYE_API: 'https://public-api.birdeye.so',
    DEXSCREENER_API: 'https://api.dexscreener.com',
    COINMARKETCAP_API: process.env.COINMARKETCAP_API || '', // Requires API key

    // Thresholds for signal normalization
    MOMENTUM_THRESHOLDS: {
        LOW: 5, // 5% change
        MEDIUM: 15, // 15% change
        HIGH: 30, // 30% change
    },

    LIQUIDITY_THRESHOLDS: {
        LOW: 10000, // $10k
        MEDIUM: 100000, // $100k
        HIGH: 1000000, // $1M
    },

    // Note: Holder thresholds are kept for normalization but patterns use level-based interpretation
    HOLDER_CHANGE_THRESHOLDS: {
        LOW: 1, // 1% change
        MEDIUM: 5, // 5% change
        HIGH: 15, // 15% change
    },

    // Default observation window (4 hours)
    DEFAULT_OBSERVATION_WINDOW_HOURS: 4,

    // Scoring weights (must sum to 1.0)
    SCORE_WEIGHTS: {
        momentum: 0.25,
        liquidity: 0.2,
        holders: 0.2,
        walletFlow: 0.2,
        attention: 0.15,
    },

    // Pattern detection thresholds
    // These thresholds work with normalized signal values (0-100 scale)
    // After normalization:
    // - momentum: 24h price change percentage (absolute value)
    // - liquidity: current liquidity level in USD
    // - holders: current holder count
    // - walletFlow: current token balance held by tracked wallets
    // - attention: social mention volume in last 24h
    PATTERN_THRESHOLDS: {
        QUIET_ACCUMULATION: {
            holderLevelMin: 50,
            walletFlowMin: 60,
            attentionMax: 40,
            momentumMax: 30,
        },

        MOMENTUM_BREAKOUT: {
            momentumMin: 70,
            liquidityMin: 50,
            holderLevelMin: 40,
            attentionMin: 50,
        },

        SOCIAL_ONLY_HYPE: {
            attentionMin: 70,
            momentumMax: 30,
            liquidityMax: 30,
            holderLevelMax: 30,
            walletFlowMax: 30,
        },

        DISTRIBUTION: {
            holderLevelMax: 30,
            walletFlowMax: 30,
            momentumMax: 30,
        },

        LIQUIDITY_RISK: {
            liquidityMax: 20,
        },
    },
};
