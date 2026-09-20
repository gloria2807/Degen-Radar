// Configuration for Degen Radar

export const CONFIG = {
  // Solana RPC endpoint (public, can be overridden)
  SOLANA_RPC: process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',

  // API endpoints for data sources
  COINGECKO_API: 'https://api.coingecko.com/api/v3',
  BIRDEYE_API: 'https://public-api.birdeye.so',
  COINMARKETCAP_API: process.env.COINMARKETCAP_API || '', // Requires API key

  // Thresholds for signal normalization
  MOMENTUM_THRESHOLDS: {
    LOW: 5,      // 5% change
    MEDIUM: 15,  // 15% change
    HIGH: 30,    // 30% change
  },

  LIQUIDITY_THRESHOLDS: {
    LOW: 10000,     // $10k
    MEDIUM: 100000, // $100k
    HIGH: 1000000,  // $1M
  },

  // Note: Holder thresholds are kept for normalization but patterns use level-based interpretation
  HOLDER_CHANGE_THRESHOLDS: {
    LOW: 1,      // 1% change
    MEDIUM: 5,   // 5% change
    HIGH: 15,    // 15% change
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
      // Holder level is high (established holder base)
      holderLevelMin: 70,          // Holder count at or above 70th percentile
      // Tracked wallets hold significant amount of tokens
      walletBalanceMin: 60,        // Wallet holdings at or above 60th percentile
      // Attention volume is still relatively low
      attentionMax: 40,            // Attention below 40th percentile
      // Price momentum has not yet become extreme (not pumping yet)
      momentumMax: 30,             // Momentum below 30th percentile (not extreme move)
    },
    MOMENTUM_BREAKOUT: {
      // Momentum is strongly positive (note: we check sign separately in convergence logic)
      momentumMin: 70,             // Momentum at or above 70th percentile
      // Liquidity is sufficient
      liquidityMin: 60,            // Liquidity at or above 60th percentile
      // Holder level is substantial (established base can support growth)
      holderLevelMin: 60,          // Holder count at or above 60th percentile
      // Attention level is elevated (current social buzz)
      attentionMin: 60,            // Attention at or above 60th percentile
    },
    SOCIAL_ONLY_HYPE: {
      // Attention level is high
      attentionMin: 70,            // Attention at or above 70th percentile
      // Momentum is weak or negative
      momentumMax: 30,             // Momentum below 30th percentile
      // Liquidity level is low
      liquidityMax: 30,            // Liquidity below 30th percentile
      // Holder level is low
      holderLevelMax: 30,          // Holder count below 30th percentile
      // Wallet balance is low
      walletBalanceMax: 30,        // Wallet holdings below 30th percentile
    },
    DISTRIBUTION: {
      // Holder level is low (declining interest)
      holderLevelMax: 30,          // Holder count below 30th percentile
      // Wallet balance is low
      walletBalanceMax: 30,        // Wallet holdings below 30th percentile
      // Momentum is weakening/negative
      momentumMax: 30,             // Momentum below 30th percentile (and we check for negative separately)
    },
    LIQUIDITY_RISK: {
      // Liquidity is low (may indicate elevated execution risk)
      liquidityMax: 30,            // Liquidity below 30th percentile
      // Note: Volatility check would need additional data
    },
  },
};