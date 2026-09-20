# Degen Radar

## What is Degen Radar?

Degen Radar is an Apify Actor that detects unusual cryptocurrency market behavior by analyzing convergence between independent market signals. Built as a research/data intelligence tool (NOT a trading bot), it helps identify noteworthy market conditions through signal analysis rather than making price predictions.

**Key Principle**: A single signal should not automatically produce a strong radar result. The system collects multiple independent signals, normalizes them, evaluates their convergence, identifies deterministic patterns, calculates an explainable Radar Score, and outputs the evidence and risk factors.

## 🔬 V1 Signals Analyzed

For the initial Solana-focused version, Degen Radar examines these five signal categories with transparent reporting on data source availability:

1. **Momentum** - 24h price change percentage from CoinGecko API ✅ WORKING
2. **Liquidity** - 24h trading volume from CoinGecko API (proxy for liquidity/activity) ✅ WORKING  
3. **Holder Activity** - Holder count data ❌ NOT AVAILABLE from accessible APIs
4. **Tracked-Wallet Flow** - Current token holdings in tracked wallets from Solana RPC ✅ WORKING
5. **Attention/Social Activity** - Social media mentions ❌ NOT ACCESSIBLE due to API restrictions

Each signal reports real data where available, with clear explanations when data is unavailable rather than inventing values.

## 🔄 Convergence Engine

The core of Degen Radar is its deterministic pattern detection engine that evaluates signal combinations to identify:

- **Quiet Accumulation**: High holder level + significant wallet holdings + low attention + moderate momentum
- **Momentum Breakout**: Strong positive momentum + sufficient liquidity + substantial holder base + elevated social activity
- **Social-Only Hype**: High social media attention without corresponding momentum, liquidity, holder base, or wallet holdings
- **Distribution**: Low holder count + low tracked wallet holdings + negative momentum
- **Liquidity Risk**: Critically low liquidity levels

Each pattern detection includes human-readable evidence explaining exactly which signals contributed to the determination, with actual measured values when available.

## 📊 Radar Score

Degen Radar calculates an explainable Radar Score (0-100) based on the weighted average of normalized signal values. The score represents the strength of observed signal convergence, NOT a price prediction or trading recommendation.

**Scoring Formula**:
```
Radar Score = Σ(normalized_signal_value × signal_weight) / Σ(active_signal_weights) × 100
```

Weights:
- Momentum: 25%
- Liquidity: 20%
- Holder Activity: 20%
- Tracked-Wallet Flow: 20%
- Attention/Social: 15%

The score is calculated ONLY from available signals. Unavailable signals are not treated as zero but are excluded from the calculation with appropriate weighting adjustment.

## 🏗️ Architecture

Degen Radar follows a modular architecture:

```
src/
├── main.ts                 # Actor entry point
├── sources/                # Signal data collectors (MIXED REAL/PLACEHOLDER)
│   ├── momentum.ts         # Price data from CoinGecko API (REAL)
│   ├── liquidity.ts        # Trading volume from CoinGecko API (REAL PROXY)
│   ├── holders.ts          # Holder count (UNAVAILABLE - clear explanation)
│   ├── walletFlow.ts       # Wallet holdings from Solana RPC (REAL)
│   └── attention.ts        # Social media monitoring (UNACCESSIBLE - clear explanation)
├── normalization/          # Signal normalization to 0-100 scale
├── engine/                 # Core logic
│   ├── convergence.ts      # Pattern detection engine
│   └── scoring.ts          # Radar Score calculation
├── types/                  # TypeScript interfaces
├── config/                 # Configuration constants
└── utils/                  # Helper functions
```

## 🔧 Actor Input

Configure your analysis through these parameters:

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| tokenAddresses | Array | Solana token addresses to analyze | `[SOL address]` |
| maxTokens | Integer | Maximum tokens to process | 10 |
| observationWindowHours | Integer | Hours to look back for signal calculation (used for holder/wallet context) | 4 |
| minLiquidityThreshold | Integer | Minimum liquidity threshold (USD) | 10000 |
| minSignalAvailability | Number | Minimum signal availability ratio (0-1) | 0.6 |
| enabledSignalCategories | Array | Signal categories to enable | All five |
| trackedWalletAddresses | Array | Specific Solana wallet addresses to track for holdings analysis | `[]` |
| attentionSources | Array | Social media sources to monitor | `[twitter, reddit]` |

## 📤 Dataset Output

Results are stored in an Apify Dataset with these key fields:

- **id**: Unique result identifier
- **token**: Token symbol (from CoinGecko) or address if symbol unavailable
- **tokenAddress**: Solana token address
- **chain**: Blockchain (solana)
- **timestamp**: Data collection time
- **radarScore**: Convergence score (0-100)
- **pattern**: Detected pattern or null
- **signals**: Raw signal values and availability with metadata explaining availability
- **evidence**: Human-readable explanation with actual values when available
- **riskFlags**: Identified risks
- **discoveredAt**: Result generation time

In the Apify Console Output tab, you'll see a table showing:
- Token
- Address
- Radar Score
- Pattern
- Timestamp
- Evidence
- Risk Flags

## 🧪 Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run locally**:
   ```bash
   apify run
   ```

3. **Test with different inputs**:
   Modify the input in `payload.json` or use the Apify CLI:
   ```bash
   apify run --input='{"tokenAddresses":[{"value":"So11111111111111111111111111111111111111112"}]}'
   ```

## 🚀 Deployment

1. **Login to Apify**:
   ```bash
   apify login
   ```

2. **Deploy the Actor**:
   ```bash
   apify push
   ```

3. **Run on Apify Platform**:
   - Use the Apify Console
   - Or via CLI: `apify call <your-username>/degen-radar`

## ⚠️ Limitations & Responsible Use

**Important Limitations**:
- **Momentum**: Uses CoinGecko API for 24h price change - REAL DATA ✅
- **Liquidity**: Uses CoinGecko 24h trading volume as proxy (NOT on-chain DEX liquidity) - REAL DATA ✅
- **Holder Activity**: Holder count data NOT AVAILABLE from accessible APIs - CLEARLY MARKED UNAVAILABLE ❌
- **Tracked-Wallet Flow**: Uses Solana RPC for current token holdings in tracked wallets - REAL DATA ✅
  - NOTE: Shows current holdings, not flow/change over time (would require historical balance data)
- **Attention/Social Activity**: Social media data NOT ACCESSIBLE due to API restrictions (Reddit/Twitter blocking) - CLEARLY MARKED UNAVAILABLE ❌
- Analysis is for research purposes only
- Does not execute trades, manage funds, or make buy/sell recommendations
- Signal availability varies by token and data source
- Public Solana RPC may have rate limits for wallet balance queries with many tracked wallets

**Responsible Use Guidelines**:
- This tool is for research and education only
- Never rely solely on Radar Scores for financial decisions
- Always do your own research (DYOR)
- Respect API rate limits and terms of service
- The Actor does not constitute financial advice
- Cryptocurrency markets are highly volatile and risky

## 🔍 Data Sources

Degen Radar uses transparent data source reporting:

- **Price Data**: CoinGecko API (https://api.coingecko.com) - provides price, 24h change, volume, market cap
- **Liquidity Proxy**: CoinGecko API - provides 24h trading volume from exchanges (NOT on-chain liquidity)
- **Holder Count**: NOT AVAILABLE from CoinGecko or other accessible APIs in this environment
- **Wallet Holdings**: Solana RPC (https://api.mainnet-beta.solana.com) - uses getTokenAccountsByOwner to query token balances in associated token accounts
- **Social Attention**: NOT ACCESSIBLE due to API blocking (Reddit/Twitter returning HTML instead of JSON)

Unavailable data sources are explicitly marked as such with clear explanations rather than inventing values or using placeholders.

## 📧 Support & Custom Solutions

For questions, issues, or custom Actor development:
- Check the Issues tab in the Apify Console
- Consider hiring an Apify Expert for specialized solutions
- Join the Apify Discord community for developer support

**Note**: This implementation follows Apify Actors development best practices including proper abort handling, error management, and Apify SDK usage. All signal collections are transparent about data source availability and limitations.