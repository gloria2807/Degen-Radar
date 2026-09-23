// Crawlee - web scraping and browser automation library (Read more at https://crawlee.dev)
// this is ESM project, and as such, it requires you to specify extensions in your relative imports
// note that we need to use `.js` even when inside TS files

import { setTimeout } from 'node:timers/promises';

import { Actor } from 'apify';
import dotenv from 'dotenv';

import { CONFIG } from './config/index.js';
import { detectPatterns } from './engine/convergence.js';
import { analyzeConvergence } from './engine/convergenceAnalysis.js';
import { buildResearchSummary } from './engine/researchSummary.js';
import { calculateRadarScore } from './engine/scoring.js';
import { normalizeSignals } from './normalization/index.js';
import { fetchAllSignals } from './sources/index.js';
import { httpGet } from './utils/http.js';
import type { ActorInput, RadarResult } from './types/index.js';

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

        if (
            !result.error &&
            Array.isArray(result.data) &&
            result.data.length > 0
        ) {
            const matchingPair =
                result.data.find(
                    (pair) =>
                        pair.baseToken?.address?.toLowerCase() ===
                        tokenAddress.toLowerCase(),
                ) ?? result.data[0];

            return (
                matchingPair.baseToken?.symbol ||
                matchingPair.baseToken?.name ||
                tokenAddress
            );
        }

        return tokenAddress;
    } catch {
        return tokenAddress;
    }
}

// The init() call configures the Actor to correctly work with the Apify-provided
// environment - mainly the storage infrastructure.
await Actor.init();

// Structure of input is defined in input_schema.json
const {
    tokenAddresses = [],
    maxTokens = 10,
    observationWindowHours = 4,
    minSignalAvailability = 0.6,
    enabledSignalCategories = [
        'momentum',
        'liquidity',
        'holders',
        'walletFlow',
        'attention',
    ],
    trackedWalletAddresses = [],
} = (await Actor.getInput<ActorInput>()) ?? ({} as ActorInput);

// Validate input
if (!tokenAddresses || tokenAddresses.length === 0) {
    console.log('No token addresses provided. Exiting.');
    await Actor.exit();
}

// Limit tokens if needed
const tokensToProcess = tokenAddresses.slice(0, maxTokens);

console.log(
    `Starting Degen Radar analysis for ${tokensToProcess.length} tokens`,
);

// Validate tracked wallet addresses once before processing tokens
const invalidWalletAddresses = trackedWalletAddresses.filter(
    (walletAddress) =>
        !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress),
);

if (invalidWalletAddresses.length > 0) {
    console.log(
        `Ignoring ${invalidWalletAddresses.length} invalid tracked wallet address(es).`,
    );
}

const validTrackedWalletAddresses = trackedWalletAddresses.filter(
    (walletAddress) =>
        /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress),
);

// Run statistics
let successfulResults = 0;
let failedResults = 0;
let skippedResults = 0;

// Process each token
for (const tokenAddress of tokensToProcess) {
    try {
        // Validate Solana address format
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenAddress)) {
            console.log(`Invalid Solana address format: ${tokenAddress}`);
            skippedResults += 1;
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
            trackedWalletAddresses: validTrackedWalletAddresses,
        });

        // Check signal availability
        const availableSignals = Object.values(rawSignals).filter(
            (signal) => signal.available,
        ).length;

        const totalSignals = Object.values(rawSignals).length;

        const signalAvailabilityRatio =
            totalSignals > 0 ? availableSignals / totalSignals : 0;

        if (signalAvailabilityRatio < minSignalAvailability) {
            console.log(
                `Insufficient signal availability for ${tokenAddress}: ` +
                    `${(signalAvailabilityRatio * 100).toFixed(1)}%`,
            );

            skippedResults += 1;
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
        const { pattern, evidence, riskFlags } =
            detectPatterns(normalizedSignals);

        // Analyze how the available signals support or contradict the pattern
        const { convergence, patternAnalysis } =
            analyzeConvergence(
                normalizedSignals,
                pattern,
            );

        console.log(
            'PATTERN RESULT:',
            JSON.stringify(
                {
                    pattern,
                    evidence,
                    riskFlags,
                    convergence,
                    patternAnalysis,
                },
                null,
                2,
            ),
        );

        // Calculate Radar Score
        const radarScore =
            calculateRadarScore(normalizedSignals);

        // Build human-readable research summary
        const researchSummary =
            buildResearchSummary(
                pattern,
                normalizedSignals,
                convergence,
                radarScore,
            );

        // Create result object
        const result: RadarResult = {
            id: `${tokenAddress}-${Date.now()}`,
            token: tokenSymbol,
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

            convergence,

            patternAnalysis,

            researchSummary,

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
                              signal: 'general',
                          },
                      ],

            sourceData: {
                observationWindowHours,
                processedAt: Date.now(),
                apiSourcesUsed: Object.values(rawSignals)
                    .filter((signal) => signal.available)
                    .map((signal) => signal.source),
            },

            discoveredAt: Date.now(),
        };

        // Push result to dataset
        await Actor.pushData(result);

        successfulResults += 1;

        console.log(
            [
                '',
                '========================================',
                `DEGEN RADAR: ${tokenSymbol}`,
                '========================================',
                `Score: ${radarScore.toFixed(2)}`,
                `Pattern: ${
                    pattern || 'No established pattern'
                }`,
                `Convergence: ${convergence.status}`,
                `Supporting signals: ${
                    convergence.supportingSignals.join(', ') ||
                    'none'
                }`,
                `Contradicting signals: ${
                    convergence.contradictingSignals.join(', ') ||
                    'none'
                }`,
                `Unavailable signals: ${
                    convergence.unavailableSignals.join(', ') ||
                    'none'
                }`,
                `Research: ${researchSummary.headline}`,
                '========================================',
                '',
            ].join('\n'),
        );

        // Small delay to avoid rate limiting
        await setTimeout(500);
    } catch (error) {
        failedResults += 1;

        const message =
            error instanceof Error
                ? error.message
                : String(error);

        console.error(
            `Failed to process token ${tokenAddress}: ${message}`,
        );

        console.error(
            'The Actor will continue processing the remaining tokens.',
        );
    }
}

// Run summary
console.log(
    [
        '',
        '========================================',
        'DEGEN RADAR RUN COMPLETE',
        '========================================',
        `Requested: ${tokensToProcess.length}`,
        `Successful: ${successfulResults}`,
        `Skipped: ${skippedResults}`,
        `Failed: ${failedResults}`,
        '========================================',
        '',
    ].join('\n'),
);

// Gracefully exit the Actor process
await Actor.exit();