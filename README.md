# Degen Radar

Degen Radar is an **Apify Actor for detecting unusual cryptocurrency market conditions through converging signals**.

It collects independent market signals for Solana tokens, normalizes them to a common 0–100 scale, evaluates how those signals interact, detects predefined market patterns, calculates an explainable Radar Score, and returns the evidence and risk factors behind each result.

Degen Radar is a **research and data-intelligence tool, not a trading bot**. It does not execute trades, manage funds, or predict future prices.

## How It Works

Degen Radar follows a simple pipeline:

```text
Token Address
     ↓
Signal Collection
     ↓
Signal Normalization
     ↓
Convergence Analysis
     ↓
Radar Score
     ↓
Pattern + Evidence + Risk Flags
     ↓
Apify Dataset
```

The core principle is that **one signal should not automatically produce a strong result**.

Instead, Degen Radar looks for relationships between multiple signals. A token showing strong price momentum means something different when liquidity, holder breadth, wallet activity, and market attention also support the observation.

The resulting analysis is deterministic and explainable. Every detected pattern includes evidence showing the signals that contributed to it.

---

## 🔬 Signals

The current Solana version analyzes five signal categories.

| Signal          | What it measures                                      | Current source |
| --------------- | ----------------------------------------------------- | -------------- |
| **Momentum**    | 24h price change percentage                           | DEX Screener   |
| **Liquidity**   | USD liquidity of the highest-liquidity trading pair   | DEX Screener   |
| **Holders**     | Current unique token holders                          | Solana RPC     |
| **Wallet Flow** | Net token movement across configured tracked wallets  | Solana RPC     |
| **Attention**   | Market activity and available project/social metadata | DEX Screener   |

### 1. Momentum

Momentum uses the token's 24-hour price change.

The raw percentage is normalized to a 0–100 signal value using configurable thresholds.

The system preserves the original value and whether the movement was positive so that pattern detection can distinguish positive momentum from negative momentum.

### 2. Liquidity

Liquidity uses the USD liquidity reported by DEX Screener for the token's highest-liquidity trading pair.

This provides a direct market-liquidity measurement rather than using trading volume as a proxy.

Very low liquidity can trigger the `liquidity_risk` pattern.

### 3. Holders

Holder data is collected from the Solana blockchain through Solana RPC.

The current implementation measures **current holder breadth**, meaning the number of unique accounts holding the token.

It does not currently claim historical holder growth or holder accumulation over time.

### 4. Tracked-Wallet Flow

Users can provide specific Solana wallet addresses to track.

Degen Radar examines token movements associated with those wallets and calculates a net token-flow signal.

Positive net flow indicates that the tracked wallets received more of the token than they sent during the observed activity.

**Important:** token flow does not prove that a wallet bought or sold the token. Transfers can occur for many reasons.

If no tracked wallets are provided, wallet-flow information may be unavailable.

### 5. Attention

The attention signal currently uses DEX Screener market activity and available token metadata, including factors such as:

* Trading activity
* Liquidity-relative activity
* Transaction activity
* Available social links
* Available website information

This is a **market-attention proxy**.

It is not a direct measurement of social-media mentions, sentiment, or viral activity.

---

## 🔄 Convergence Engine

The convergence engine evaluates normalized signals together and looks for predefined combinations.

Degen Radar currently recognizes five patterns.

### Quiet Accumulation

Indicates a combination of:

* A meaningful current holder base
* Positive tracked-wallet token flow
* Low market attention
* Limited price momentum

The result is intentionally described as a signal combination rather than proof that accumulation is occurring.

### Momentum Breakout

Indicates:

* Strong positive momentum
* Sufficient liquidity
* A substantial holder base
* Elevated market attention

This pattern identifies strong simultaneous market signals. It does not predict that the price will continue rising.

### Social-Only Hype

Indicates:

* High attention
* Limited momentum
* Low liquidity
* Limited holder breadth
* Limited or unavailable positive wallet-flow evidence

The pattern highlights situations where attention is not accompanied by comparable market fundamentals.

### Distribution

Indicates:

* Low holder breadth
* Negative tracked-wallet flow
* Negative or weak momentum

This identifies a combination of weakening market signals and negative tracked-wallet movement.

### Liquidity Risk

Indicates critically low normalized liquidity.

This pattern can be detected independently of the other convergence patterns because insufficient liquidity represents a direct market-structure risk.

---

## 📊 Radar Score

Degen Radar calculates an explainable score from **0 to 100** using the weighted average of available normalized signals.

### Weights

| Signal      | Weight |
| ----------- | -----: |
| Momentum    |    25% |
| Liquidity   |    20% |
| Holders     |    20% |
| Wallet Flow |    20% |
| Attention   |    15% |

The score uses only signals that are currently available.

Unavailable signals are **excluded from the calculation rather than treated as zero**. The remaining weights are automatically rebalanced through the weighted-average calculation.

### Formula

```text
Radar Score =
Σ(normalized signal × signal weight)
-------------------------------------
       Σ(active signal weights)
```

The result is constrained to the 0–100 range.

A higher score means that the currently available signals collectively show stronger normalized activity according to Degen Radar's rules.

It is **not a price prediction, probability of a price increase, or trading recommendation**.

---

## 🏗️ Architecture

Degen Radar uses a modular TypeScript architecture:

```text
src/
├── main.ts                    # Actor entry point
│
├── sources/                   # Signal data collectors
│   ├── momentum.ts            # 24h price momentum
│   ├── liquidity.ts           # USD liquidity
│   ├── holders.ts             # Current holder breadth
│   ├── walletFlow.ts          # Tracked-wallet token flow
│   └── attention.ts           # Market attention proxy
│
├── normalization/
│   └── index.ts               # Converts raw signals to 0–100
│
├── engine/
│   ├── convergence.ts         # Pattern detection + evidence
│   └── scoring.ts              # Radar Score calculation
│
├── types/
│   └── index.ts               # Shared TypeScript interfaces
│
├── config/
│   └── index.ts               # Thresholds and scoring weights
│
└── utils/
    └── http.ts                # HTTP and utility functions
```

The separation between collection, normalization, scoring, and convergence makes it possible to replace or extend individual data sources without rewriting the core analysis engine.

---

## 🔧 Actor Input

The Actor accepts the following input:

| Field                     | Type    | Description                                              | Default  |
| ------------------------- | ------- | -------------------------------------------------------- | -------- |
| `tokenAddresses`          | Array   | Solana token mint addresses to analyze                   | Required |
| `maxTokens`               | Integer | Maximum number of tokens to process                      | `10`     |
| `observationWindowHours`  | Integer | Observation window used by time-dependent signal sources | `4`      |
| `minSignalAvailability`   | Number  | Minimum fraction of signals that must be available       | `0.6`    |
| `enabledSignalCategories` | Array   | Signal categories to collect                             | All five |
| `trackedWalletAddresses`  | Array   | Solana wallets to monitor for token flow                 | `[]`     |

### Example

```json
{
  "tokenAddresses": [
    "62yzpmKJB6XiVtZcQZhUkUXhqwN3UgCbffUi4JM9pump"
  ],
  "maxTokens": 10,
  "observationWindowHours": 4,
  "minSignalAvailability": 0.6,
  "enabledSignalCategories": [
    "momentum",
    "liquidity",
    "holders",
    "walletFlow",
    "attention"
  ],
  "trackedWalletAddresses": []
}
```

### Selective Signals

Individual signal categories can be disabled.

For example:

```json
{
  "tokenAddresses": [
    "YOUR_TOKEN_ADDRESS"
  ],
  "enabledSignalCategories": [
    "momentum",
    "liquidity",
    "holders"
  ]
}
```

Disabled signals are reported as unavailable and are excluded from Radar Score calculation.

---

## 📤 Dataset Output

Each analyzed token produces a structured record in the Apify Dataset.

A result contains:

| Field          | Description                                   |
| -------------- | --------------------------------------------- |
| `id`           | Unique result identifier                      |
| `token`        | Token symbol/name when available              |
| `tokenAddress` | Solana token mint address                     |
| `chain`        | Blockchain, currently `solana`                |
| `timestamp`    | Analysis timestamp                            |
| `radarScore`   | Normalized convergence score from 0–100       |
| `pattern`      | Detected pattern or `null`                    |
| `signals`      | Raw and normalized signal information         |
| `evidence`     | Human-readable evidence for detected patterns |
| `riskFlags`    | Identified risk conditions                    |
| `sourceData`   | Analysis metadata and available sources       |
| `discoveredAt` | Result generation timestamp                   |

### Example Result Structure

```json
{
  "token": "TOKEN",
  "tokenAddress": "TOKEN_MINT",
  "chain": "solana",
  "radarScore": 62.13,
  "pattern": "momentum_breakout",
  "signals": {
    "momentum": {
      "value": 1355,
      "available": true
    },
    "liquidity": {
      "value": 112432.19,
      "available": true
    },
    "holders": {
      "value": 3467,
      "available": true
    },
    "walletFlow": {
      "value": 0,
      "available": true
    },
    "attention": {
      "value": 95,
      "available": true
    }
  },
  "evidence": [],
  "riskFlags": []
}
```

The actual dataset also contains timestamps, source information, normalization metadata, and pattern-specific evidence.

---

## 🧪 Local Development

### 1. Clone the repository

```bash
git clone https://github.com/gloria2807/Degen-Radar.git
cd Degen-Radar
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the project

```bash
npm run build
```

### 4. Run tests

```bash
npm test
```

### 5. Run linting

```bash
npm run lint
```

### 6. Check formatting

```bash
npm run format:check
```

### 7. Run the Actor locally

```bash
apify run
```

The local Actor uses the configured Apify storage directories and input data.

---

## 🧪 Testing

The project includes automated tests for the core analytical components.

The test suite covers:

* Signal normalization
* Momentum normalization
* Liquidity normalization
* Wallet-flow handling
* Radar Score calculation
* Weighted scoring
* Pattern detection
* Risk-flag generation

Real Solana token runs are also used to validate the complete pipeline from signal collection through dataset output.

Before deployment, run:

```bash
npm test
npm run build
npm run lint
npm run format:check
```

---

## 🚀 Deployment

### Login to Apify

```bash
apify login
```

### Push the Actor

```bash
apify push
```

The Actor can then be run through the Apify Console or CLI.

```bash
apify call <your-username>/degen-radar
```

When running on the Apify Platform, the Actor collects its input, performs the signal analysis, and pushes the resulting records to an Apify Dataset.

---

## ⚠️ Limitations

Degen Radar is intentionally transparent about what its signals do and do not represent.

### Data limitations

**Momentum**

Uses 24-hour price-change data from DEX Screener. It represents recent price movement and does not predict future movement.

**Liquidity**

Uses reported USD liquidity for the token's highest-liquidity trading pair on DEX Screener. Liquidity can change rapidly.

**Holders**

Measures current unique holders through Solana RPC. It does not currently provide historical holder-growth analysis.

**Wallet Flow**

Measures token movement involving configured tracked wallets. Positive or negative flow does not prove buying, selling, accumulation, or distribution.

**Attention**

Uses DEX Screener market activity and available metadata as an attention proxy. It is not a comprehensive social-media monitoring system and does not measure sentiment.

**External dependencies**

Signal collection depends on external APIs and Solana RPC availability. Individual signals can become unavailable because of API failures, rate limits, network problems, or missing data.

### Analytical limitations

Degen Radar uses deterministic thresholds and weighted scoring.

The patterns are analytical classifications based on observed signals. They are not guarantees, predictions, probabilities, or investment recommendations.

---

## 🛡️ Responsible Use

Degen Radar is designed for:

* Cryptocurrency market research
* Data analysis
* Market-condition monitoring
* Technical experimentation
* Building downstream data applications
* Research into multi-signal market analysis

It does **not**:

* Execute trades
* Manage funds
* Custody cryptocurrency
* Provide personalized financial advice
* Guarantee market outcomes
* Predict future token prices

Users should independently evaluate any information produced by the Actor and understand the limitations of the underlying data.

---

## 🔍 Data Sources

### DEX Screener

Used for:

* Token/pair discovery
* Token symbols and names
* 24h price-change data
* USD liquidity
* Market activity
* Available project metadata and social links

### Solana RPC

Used for:

* Current token-holder analysis
* Token account discovery
* Tracked-wallet token balances
* Token movement analysis

The default public Solana RPC endpoint is:

```text
https://api.mainnet-beta.solana.com
```

The Actor reports source availability as part of its output rather than silently replacing missing information with fabricated or placeholder values.

---

## 📁 Project Structure

```text
Degen-Radar/
├── .actor/
│   ├── actor.json
│   ├── dataset_schema.json
│   ├── input_schema.json
│   └── output_schema.json
│
├── src/
│   ├── config/
│   ├── engine/
│   ├── normalization/
│   ├── sources/
│   ├── types/
│   ├── utils/
│   └── main.ts
│
├── test/
│   ├── main.test.ts
│   ├── normalization.test.ts
│   ├── scoring.test.ts
│   └── convergence.test.ts
│
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📌 Status

Degen Radar is currently a **Solana-focused V1 research/data-intelligence Actor**.

The current implementation focuses on making every signal transparent, deterministic, and explainable rather than maximizing the number of data sources.

Future iterations can expand the signal layer with additional on-chain, market, and attention data sources while keeping the same normalization and convergence architecture.

---

## License

ISC
