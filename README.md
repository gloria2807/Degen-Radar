# Degen Radar

Degen Radar is an **Apify Actor for detecting unusual cryptocurrency market conditions through converging signals**.

It collects independent market signals for Solana tokens, normalizes them to a common 0–100 scale, evaluates how those signals interact, detects predefined market patterns, calculates an explainable Radar Score, and returns the evidence and risk factors behind each result.

Degen Radar is a **research and data-intelligence tool, not a trading bot**. It does not execute trades, manage funds, or predict future prices.

---

## Why Degen Radar?

Individual token metrics are already available across many market-data tools.

The problem is that researching a token often means checking several signals separately and trying to understand what they mean **together**.

Degen Radar focuses on that second step.

Instead of returning five disconnected numbers, it evaluates how available signals converge around predefined patterns and shows:

- which signals support the pattern
- which signals contradict it
- which signals were unavailable
- why the pattern was detected
- what risks were identified

If the available evidence is not sufficient for a predefined pattern, Degen Radar does not force a classification.

It returns:

> **No established pattern**

---

## How It Works

Degen Radar follows this pipeline:

```text
Token Address
     ↓
Signal Collection
     ↓
Signal Availability Check
     ↓
Signal Normalization
     ↓
Convergence Analysis
     ↓
Radar Score
     ↓
Pattern + Confidence
     ↓
Supporting + Contradicting Signals
     ↓
Evidence + Risk Flags
     ↓
Research Summary
     ↓
Apify Dataset

The core principle is that one signal should not automatically produce a strong result.

A token showing strong price momentum means something different when liquidity, holder breadth, wallet activity, and market attention also support the observation.

Degen Radar therefore evaluates relationships between multiple signals rather than treating one metric as a standalone conclusion.

🔬 Signals

The current Solana version analyzes five signal categories.

Signal	What it measures	Current source
Momentum	24h price change percentage	DEX Screener
Liquidity	USD liquidity of the highest-liquidity trading pair	DEX Screener
Holders	Current unique token holders	Solana RPC
Wallet Flow	Net token movement across configured tracked wallets	Solana RPC
Attention	Market activity and available project/social metadata	DEX Screener
1. Momentum

Momentum uses the token's 24-hour price change.

The raw percentage is normalized to a 0–100 signal value using configurable thresholds.

The system preserves the original value and whether the movement was positive so that pattern detection can distinguish positive momentum from negative momentum.

2. Liquidity

Liquidity uses the USD liquidity reported by DEX Screener for the token's highest-liquidity trading pair.

This provides a direct market-liquidity measurement rather than using trading volume as a proxy.

Very low liquidity can trigger the liquidity_risk pattern.

3. Holders

Holder data is collected from the Solana blockchain through Solana RPC.

The current implementation measures current holder breadth, meaning the number of unique accounts holding the token.

It does not currently claim historical holder growth or holder accumulation over time.

4. Tracked-Wallet Flow

Users can provide specific Solana wallet addresses to track.

Degen Radar examines token movements associated with those wallets and calculates a net token-flow signal.

Positive net flow indicates that the tracked wallets received more of the token than they sent during the observed activity.

Important: token flow does not prove that a wallet bought or sold the token. Transfers can occur for many reasons.

If no tracked wallets are provided, wallet-flow information may be unavailable.

5. Attention

The attention signal currently uses DEX Screener market activity and available token metadata.

This provides a market-attention proxy.

It is not a direct measurement of social-media mentions, sentiment, or viral activity.

🔄 Signal Convergence

The convergence engine is the core analytical layer of Degen Radar.

After collecting and normalizing the signals, the Actor evaluates predefined combinations.

For each result, the convergence analysis reports:

Supporting signals
Contradicting signals
Unavailable signals
Convergence strength
Reason
Convergence strength

Degen Radar uses four explainable states:

Status	Meaning
Strong	Multiple available signals strongly support the detected pattern with limited contradiction
Moderate	Several available signals support the pattern, but there is some uncertainty or contradiction
Weak	The pattern has limited supporting evidence
None	The available evidence does not establish a pattern

These labels describe the relationship between the available signals. They are not probabilities of future market performance.

📌 Detected Patterns

Degen Radar currently recognizes five patterns.

Quiet Accumulation

Indicates a combination of:

meaningful current holder breadth
positive tracked-wallet token flow
low market attention
limited price momentum

The result is intentionally described as a signal combination rather than proof that accumulation is occurring.

Momentum Breakout

Indicates:

strong positive momentum
sufficient liquidity
substantial holder breadth
elevated market attention

This pattern identifies strong simultaneous market signals.

It does not predict that the price will continue rising.

Social-Only Hype

Indicates:

high attention
limited momentum
low liquidity
limited holder breadth
limited or unavailable positive wallet-flow evidence

The pattern highlights situations where attention is not accompanied by comparable supporting market signals.

Distribution

Indicates:

low holder breadth
negative tracked-wallet flow
negative or weak momentum

This identifies a combination of weakening market signals and negative tracked-wallet movement.

Liquidity Risk

Indicates critically low normalized liquidity.

This pattern can be detected independently of the other convergence patterns because insufficient liquidity represents a direct market-structure risk.

🧠 Pattern Analysis

Every detected pattern includes an explicit explanation.

For example:

{
  "patternAnalysis": {
    "name": "momentum_breakout",
    "confidence": "strong",
    "supportingSignals": [
      "momentum",
      "liquidity",
      "holders",
      "attention"
    ],
    "contradictingSignals": [],
    "reason": "Four available signals support the detected pattern with limited contradiction."
  }
}

This is intentionally different from a black-box classification.

The user can inspect the signals that contributed to the result.

📊 Radar Score

Degen Radar calculates an explainable score from 0 to 100 using the weighted average of available normalized signals.

Weights
Signal	Weight
Momentum	25%
Liquidity	20%
Holders	20%
Wallet Flow	20%
Attention	15%

The score uses only signals that are currently available.

Unavailable signals are excluded from the calculation rather than treated as zero.

The remaining active signal weights are automatically rebalanced through the weighted-average calculation.

Formula
Radar Score =
Σ(normalized signal × signal weight)
-------------------------------------
       Σ(active signal weights)

The result is constrained to the 0–100 range.

A higher score means that the currently available signals collectively show stronger normalized activity according to Degen Radar's scoring rules.

It is not:

a price prediction
a probability of price increase
a trading recommendation
a safety guarantee
🔎 Research Summary

Every result also contains a human-readable research summary.

The summary includes:

a headline
an interpretation of the detected pattern
the number of available signals
unavailable-signal information
analytical limitations

Example:

Headline:
Momentum breakout

Interpretation:
Degen Radar detected momentum breakout based on
the available signal combination.

Supporting signals:
momentum, liquidity, holders, attention

Contradicting signals:
none

Unavailable:
walletFlow

The summary is generated from the structured analysis rather than from an external language model.

⚠️ Missing Data

Degen Radar does not silently convert missing information into zero.

Each signal has an availability state.

For example:

Momentum       ✓
Liquidity      ✓
Holders        ✓
Wallet Flow    —
Attention      ✓

4 / 5 signals available

The Actor checks the configured minimum signal availability before analyzing a token.

If too much data is unavailable, the token is skipped instead of producing a misleading result.

📦 Batch Analysis

Degen Radar can analyze multiple Solana tokens in one run.

The Actor accepts up to 50 token addresses.

1 token   → 1 research result
10 tokens → up to 10 research results
50 tokens → up to 50 research results

Each successfully analyzed token produces its own structured record in the Apify Dataset.

This makes Degen Radar suitable for both individual research and automated batch analysis.

🔧 Actor Input

The Actor accepts:

Field	Type	Description	Default
tokenAddresses	Array	Solana token mint addresses to analyze	Required
maxTokens	Integer	Maximum number of tokens to process	10
observationWindowHours	Integer	Observation window used by time-dependent sources	4
minSignalAvailability	Number	Minimum fraction of signals that must be available	0.6
enabledSignalCategories	Array	Signal categories to collect	All five
trackedWalletAddresses	Array	Solana wallets to monitor for token flow	[]
Example
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
Selective Signals

Individual signal categories can be disabled.

For example:

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

Disabled signals are treated as unavailable and are excluded from Radar Score calculation.

📤 Dataset Output

Each analyzed token produces a structured record in the Apify Dataset.

A result contains:

Field	Description
id	Unique result identifier
token	Token symbol/name when available
tokenAddress	Solana token mint address
chain	Blockchain, currently solana
timestamp	Analysis timestamp
radarScore	Normalized score from 0–100
pattern	Detected pattern or null
signals	Raw and normalized signal information
convergence	Supporting, contradicting and unavailable signals
patternAnalysis	Pattern explanation and confidence
researchSummary	Human-readable research interpretation
evidence	Evidence associated with the analysis
riskFlags	Identified risk conditions
sourceData	Analysis metadata and available sources
discoveredAt	Result generation timestamp
Example Result
{
  "token": "TOKEN",
  "tokenAddress": "TOKEN_MINT",
  "chain": "solana",
  "radarScore": 81.2,
  "pattern": "momentum_breakout",
  "convergence": {
    "status": "strong",
    "supportingSignals": [
      "momentum",
      "liquidity",
      "holders",
      "attention"
    ],
    "contradictingSignals": [],
    "unavailableSignals": [
      "walletFlow"
    ],
    "reason": "Four available signals support the detected pattern with limited contradiction."
  },
  "patternAnalysis": {
    "name": "momentum_breakout",
    "confidence": "strong",
    "supportingSignals": [
      "momentum",
      "liquidity",
      "holders",
      "attention"
    ],
    "contradictingSignals": []
  }
}
🏗️ Architecture

Degen Radar uses a modular TypeScript architecture:

src/
├── main.ts                    # Actor entry point
│
├── sources/                   # Signal data collectors
│   ├── momentum.ts            # 24h price momentum
│   ├── liquidity.ts           # USD liquidity
│   ├── holders.ts             # Current holder breadth
│   ├── walletFlow.ts          # Tracked-wallet token flow
│   └── attention.ts            # Market attention proxy
│
├── normalization/
│   └── index.ts               # Converts raw signals to 0–100
│
├── engine/
│   ├── convergence.ts         # Pattern detection + evidence
│   ├── convergenceAnalysis.ts # Supporting/contradicting analysis
│   ├── researchSummary.ts     # Human-readable result summary
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

The separation between collection, normalization, scoring, and convergence makes it possible to replace or extend individual data sources without rewriting the core analysis engine.

🔧 Data Flow
Apify Actor Input
       ↓
Token Validation
       ↓
Signal Collection
       ↓
Signal Availability
       ↓
Normalization
       ↓
Pattern Detection
       ↓
Convergence Analysis
       ↓
Radar Score
       ↓
Research Summary
       ↓
Apify Dataset

The Actor can process multiple tokens in one run and continues processing remaining tokens when an individual token cannot be analyzed.

🧪 Testing

The project includes automated tests for the analytical engine.

Tests cover:

Signal normalization
Momentum normalization
Liquidity normalization
Wallet-flow handling
Radar Score calculation
Weighted scoring
Pattern detection
Risk-flag generation
Convergence analysis
Supporting and contradicting signals
Missing signal handling
Research summary generation

Before deployment:

npm test
npm run build
npm run lint
npm run format:check
🧪 Real-Data Validation

The complete Actor pipeline has also been tested against live Solana tokens.

Validation covers:

momentum breakout
quiet accumulation
social-only hype
distribution
liquidity risk
no established pattern
missing wallet-flow data
insufficient signal availability

The patterns are deterministic classifications based on predefined rules and thresholds.

⚙️ Local Development
Install dependencies
npm install
Run tests
npm test
Build
npm run build
Run the Actor
apify run
🚀 Deployment

Login to Apify:

apify login

Push the Actor:

apify push

The deployed Actor can then be run through the Apify Console, API, integrations, or CLI.

🤖 Automation and Agent Workflows

Degen Radar returns structured JSON containing:

signals
normalized values
pattern
convergence strength
supporting signals
contradicting signals
unavailable signals
evidence
risk flags
limitations

This makes the Actor suitable as a research component inside larger automated workflows, including systems where another application or AI agent needs structured market evidence.

The underlying analysis is intentionally deterministic rather than generated by a language model.

This keeps the analytical rules inspectable while allowing downstream systems to reason over the structured result.

⚠️ Limitations

Degen Radar is transparent about what its signals do and do not represent.

Momentum

Uses 24-hour price-change data from DEX Screener.

It represents recent price movement and does not predict future movement.

Liquidity

Uses reported USD liquidity for the token's highest-liquidity trading pair on DEX Screener.

Liquidity can change rapidly.

Holders

Measures current unique holders through Solana RPC.

It does not currently provide historical holder-growth analysis.

Wallet Flow

Measures token movement involving configured tracked wallets.

Positive or negative flow does not prove buying, selling, accumulation, or distribution.

Attention

Uses DEX Screener market activity and available metadata as an attention proxy.

It is not a comprehensive social-media monitoring system and does not measure sentiment.

External Dependencies

Signal collection depends on external APIs and Solana RPC availability.

Individual signals can become unavailable because of API failures, rate limits, network problems, or missing data.

Analytical Limitations

Degen Radar uses deterministic thresholds and weighted scoring.

The patterns are analytical classifications based on observed signals.

They are not guarantees, predictions, probabilities, or investment recommendations.

🛡️ Responsible Use

Degen Radar is designed for:

Cryptocurrency market research
Data analysis
Market-condition monitoring
Technical experimentation
Building downstream data applications
Automated research workflows

It does not:

Execute trades
Manage funds
Custody cryptocurrency
Provide personalized financial advice
Guarantee market outcomes
Predict future token prices

Users should independently evaluate information produced by the Actor and understand the limitations of the underlying data.

🔍 Data Sources
DEX Screener

Used for:

Token and pair discovery
Token symbols and names
24h price-change data
USD liquidity
Market activity
Available project metadata and social links
Solana RPC

Used for:

Current token-holder analysis
Token account discovery
Tracked-wallet token balances
Token movement analysis

The Actor reports source availability as part of its output rather than silently replacing missing information with fabricated or placeholder values.

📁 Project Structure
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
│   ├── normalization.test.ts
│   ├── scoring.test.ts
│   ├── convergence.test.ts
│   ├── convergenceAnalysis.test.ts
│   └── researchSummary.test.ts
│
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md


📌 Status

Degen Radar is currently a Solana-focused V1 research and data-intelligence Actor.

The current implementation focuses on making every signal transparent, deterministic, and explainable rather than maximizing the number of data sources.

The architecture can be extended with additional market, on-chain and attention signals while keeping the same collection, normalization, scoring and convergence layers.