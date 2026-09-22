// Crawlee - web scraping and browser automation library (Read more at https://crawlee.dev)
// this is ESM project, and as such, it requires you to specify extensions in your relative imports
// note that we need to use `.js` even when inside TS files
import { setTimeout } from 'node:timers/promises';

import { Actor } from 'apify';
import dotenv from 'dotenv';

import { CONFIG } from './config/index.js';
import { detectPatterns } from './engine/convergence.js';
import { calculateRadarScore } from './engine/scoring.js';
import { normalizeSignals } from './normalization/index.js';
import { fetchAllSignals } from './sources/index.js';
import type { ActorInput, RadarResult } from './types/index.js';
import { httpGet } from './utils/http.js';

dotenv.config();

// Helper function to get token symbol from Dexscreener for display purposes
async function getTokenSymbol(tokenAddress: string): Promise<string> {
    try {
        const url = `${CONFIG.DEXSCREENER_API}/token-pairs/v1/solana/${tokenAddress}`;

        const result = await httpGet<{
            data?: {
                baseToken?: {
                    address?: string;
                    symbol?: string;
                    name?: string;
                };
            }[];
        }>(url);

        if (!result.error && Array.isArray(result.data) && result.data.length > 0) {
            const matchingPair =
                result.data.find((pair) => pair.baseToken?.address?.toLowerCase() === tokenAddress.toLowerCase()) ??
                result.data[0];

            return matchingPair.baseToken?.symbol || matchingPair.baseToken?.name || tokenAddress;
        }

        return tokenAddress;
    } catch {
        return tokenAddress;
    }
}

// The init() call configures the Actor to correctly work with the Apify-provided environment - mainly the storage infrastructure. It is necessary that every Actor performs an init() call.
await Actor.init();

// Structure of input is defined in input_schema.json
const {
    tokenAddresses = [],
    maxTokens = 10,
    observationWindowHours = 4,
    minSignalAvailability = 0.6, // 60% of signals must be available
    enabledSignalCategories = ['momentum', 'liquidity', 'holders', 'walletFlow', 'attention'],
    trackedWalletAddresses = [],
} = (await Actor.getInput<ActorInput>()) ?? ({} as ActorInput);

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
            minSignalAvailability,
            enabledSignalCategories,
            trackedWalletAddresses,
        });

        // Check signal availability
        const availableSignals = Object.values(rawSignals).filter((s) => s.available).length;
        const totalSignals = Object.values(rawSignals).length;
        const signalAvailabilityRatio = availableSignals / totalSignals;

        if (signalAvailabilityRatio < minSignalAvailability) {
            console.log(
                `Insufficient signal availability for ${tokenAddress}: ` +
                    `${(signalAvailabilityRatio * 100).toFixed(1)}%`,
            );

            continue;
        }

        // DEBUG: Show raw signal values
        console.log(
            'Raw signals:',
            JSON.stringify(
                {
                    momentum: rawSignals.momentum,
                    liquidity: rawSignals.liquidity,
                    holders: rawSignals.holders,
                    walletFlow: rawSignals.walletFlow,
                    attention: rawSignals.attention,
                },
                null,
                2,
            ),
        );

        // Normalize signals to 0-100 scale
        const normalizedSignals = normalizeSignals(rawSignals);

        // DEBUG: Show normalized signal values
        console.log(
            'Normalized signals:',
            JSON.stringify(
                {
                    momentum: normalizedSignals.momentum,
                    liquidity: normalizedSignals.liquidity,
                    holders: normalizedSignals.holders,
                    walletFlow: normalizedSignals.walletFlow,
                    attention: normalizedSignals.attention,
                },
                null,
                2,
            ),
        );

        // Detect convergence patterns
        const { pattern, evidence, riskFlags } = detectPatterns(normalizedSignals);
        console.log(
            'PATTERN RESULT:',
            JSON.stringify(
                {
                    pattern,
                    evidence,
                    riskFlags,
                },
                null,
                2,
            ),
        );
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
                attention: rawSignals.attention,
            },
            evidence,
            riskFlags:
  riskFlags.length > 0
    ? riskFlags
    : [
        {
          type: 'none_detected',
          severity: 'low',
          description:
            'No major risk flags detected from the available signals.',
          signal: 'momentum',
        },
      ],
            sourceData: {
                observationWindowHours,
                processedAt: Date.now(),
                apiSourcesUsed: Object.values(rawSignals)
                    .filter((s) => s.available)
                    .map((s) => s.source),
            },
            discoveredAt: Date.now(),
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
