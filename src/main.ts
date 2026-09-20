// Crawlee - web scraping and browser automation library (Read more at https://crawlee.dev)
// this is ESM project, and as such, it requires you to specify extensions in your relative imports
// note that we need to use `.js` even when inside TS files
import { setTimeout } from 'node:timers/promises';

import { CheerioCrawler } from './crawlee/cheerio';
// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import { Actor } from 'apify';

import { detectPatterns } from './engine/convergence.ts';
import { calculateRadarScore } from './engine/scoring.ts';
import { normalizeSignals } from './normalization/index.ts';
// Import our modules
import { fetchAllSignals } from './sources/index.ts';
import type { ActorInput, RadarResult } from './types/index.ts';

// Helper function to get token symbol from CoinGecko for display purposes
async function getTokenSymbol(tokenAddress: string): Promise<string> {
  try {
    // For simplicity in this implementation, we'll use a mapping for known tokens
    // In a production system, we'd use a token registry or lookup service
    let coingeckoId = 'solana'; // Default to SOL

    // For now, we'll handle SOL specifically and note that other tokens would need a lookup
    if (tokenAddress.toLowerCase() === 'so11111111111111111111111111111111111111112') {
      coingeckoId = 'solana';
    }
    // Add more known token mappings as needed for the demo

    // Use CoinGecko API (no key required for basic endpoints)
    const coingeckoUrl = `${CONFIG.COINGECKO_API}/coins/${coingeckoId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;
    const coingeckoResult = await httpGet<any>(coingeckoUrl);

    if (!coingeckoResult.error && coingeckoResult.data) {
      return coingeckoResult.data.symbol || coingeckoResult.data.name || tokenAddress;
    }
    return tokenAddress;
  } catch (error) {
    // If we can't get the symbol, fall back to the address
    return tokenAddress;
  }
}

interface Input extends ActorInput {
  // Additional internal processing fields can go here
}

// The init() call configures the Actor to correctly work with the Apify-provided environment - mainly the storage infrastructure. It is necessary that every Actor performs an init() call.
await Actor.init();

// Structure of input is defined in input_schema.json
const {
  tokenAddresses = [],
  maxTokens = 10,
  observationWindowHours = 4,
  minLiquidityThreshold = 10000,
  minSignalAvailability = 0.6, // 60% of signals must be available
  enabledSignalCategories = ['momentum', 'liquidity', 'holders', 'walletFlow', 'attention'],
  trackedWalletAddresses = [],
  attentionSources = ['twitter', 'reddit']
} = (await Actor.getInput<Input>()) ?? ({} as Input);

// Validate input
if (!tokenAddresses || tokenAddresses.length === 0) {
  console.log('No token addresses provided. Exiting.');
  await Actor.exit();
}

// Limit tokens if needed
const tokensToProcess = tokenAddresses.slice(0, maxTokens);

console.log(`Starting Degen Radar analysis for ${tokensToProcess.length} tokens`);

// Process each token
for (const tokenAddress of tokensToProcess) {
  try {
    // Validate Solana address format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenAddress)) {
      console.log(`Invalid Solana address format: ${tokenAddress}`);
      continue;
    }

    console.log(`Processing token: ${tokenAddress}`);

    // Get token symbol for display purposes
    const tokenSymbol = await getTokenSymbol(tokenAddress);

    // Fetch all signals for this token
    const rawSignals = await fetchAllSignals(tokenAddress, {
      tokenAddresses: [tokenAddress],
      maxTokens,
      observationWindowHours,
      minLiquidityThreshold,
      minSignalAvailability,
      enabledSignalCategories,
      trackedWalletAddresses,
      attentionSources
    });

    // Check signal availability
    const availableSignals = Object.values(rawSignals).filter(s => s.available).length;
    const totalSignals = Object.values(rawSignals).length;
    const signalAvailabilityRatio = availableSignals / totalSignals;

    if (signalAvailabilityRatio < minSignalAvailability) {
      console.log(`Insufficient signal availability for ${tokenAddress}: ${(signalAvailabilityRatio * 100).toFixed(1)}%`);
      // Still process but with warning
    }

    // DEBUG: Show raw signal values
    console.log('Raw signals:', JSON.stringify({
      momentum: rawSignals.momentum,
      liquidity: rawSignals.liquidity,
      holders: rawSignals.holders,
      walletFlow: rawSignals.walletFlow,
      attention: rawSignals.attention
    }, null, 2));

    // Normalize signals to 0-100 scale
    const normalizedSignals = normalizeSignals(rawSignals);

    // DEBUG: Show normalized signal values
    console.log('Normalized signals:', JSON.stringify({
      momentum: normalizedSignals.momentum,
      liquidity: normalizedSignals.liquidity,
      holders: normalizedSignals.holders,
      walletFlow: normalizedSignals.walletFlow,
      attention: normalizedSignals.attention
    }, null, 2));

    // Detect convergence patterns
    const { pattern, evidence, riskFlags } = detectPatterns(normalizedSignals);

    // Calculate Radar Score
    const radarScore = calculateRadarScore(normalizedSignals);

    // Create result object
    const result: RadarResult = {
      id: `${tokenAddress}-${Date.now()}`,
      token: tokenSymbol, // Use the actual token symbol for better readability
      tokenAddress,
      chain: 'solana',
      timestamp: Date.now(),
      radarScore,
      pattern,
      signals: {
        momentum: rawSignals.momentum,
        liquidity: rawSignals.liquidity,
        holders: rawSignals.holders,
        walletFlow: rawSignals.walletFlow,
        attention: rawSignals.attention
      },
      evidence,
      riskFlags,
      sourceData: {
        observationWindowHours,
        processedAt: Date.now(),
        apiSourcesUsed: Object.values(rawSignals)
          .filter(s => s.available)
          .map(s => s.source)
      },
      discoveredAt: Date.now()
    };

    // Push result to dataset
    await Actor.pushData(result);

    console.log(`Processed ${tokenSymbol} (${tokenAddress}): Score=${radarScore}, Pattern=${pattern || 'None'}`);

    // Small delay to avoid rate limiting
    await setTimeout(500);
  } catch (error) {
    console.error(`Error processing token ${tokenAddress}:`, error);
    // Continue with next token
  }
}

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit()
await Actor.exit();