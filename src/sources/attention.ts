// Attention signal collector - measures observable market attention
// using public DEX Screener market and token metadata.

import { CONFIG } from '../config/index.js';
import type { SignalValue } from '../types/index.js';
import { httpGet } from '../utils/http.js';

interface DexScreenerPair {
    chainId?: string;
    dexId?: string;
    url?: string;
    pairAddress?: string;

    baseToken?: {
        address?: string;
        name?: string;
        symbol?: string;
    };

    quoteToken?: {
        address?: string;
        name?: string;
        symbol?: string;
    };

    priceUsd?: string;

    volume?: {
        h24?: number;
        h6?: number;
        h1?: number;
        m5?: number;
    };

    txns?: {
        h24?: {
            buys?: number;
            sells?: number;
        };
        h6?: {
            buys?: number;
            sells?: number;
        };
        h1?: {
            buys?: number;
            sells?: number;
        };
    };

    liquidity?: {
        usd?: number;
    };

    info?: {
        websites?: {
            label?: string;
            url?: string;
        }[];
        socials?: {
            type?: string;
            url?: string;
        }[];
    };
}

export async function fetchAttentionSignal(
    tokenAddress: string,
    _tokenSymbol?: string,
    observationWindowHours: number = CONFIG.DEFAULT_OBSERVATION_WINDOW_HOURS,
): Promise<SignalValue> {
    try {
        if (!isValidSolanaAddress(tokenAddress)) {
            return {
                value: null,
                timestamp: Date.now(),
                source: 'dexscreener',
                available: false,
                metadata: {
                    error: 'Invalid token address format',
                },
            };
        }

        const url = `${CONFIG.DEXSCREENER_API}/token-pairs/v1/solana/${tokenAddress}`;

        const result = await httpGet<{
            pairs?: {
                volume?: {
                    h24?: number;
                };
                txns?: {
                    h24?: {
                        buys?: number;
                        sells?: number;
                    };
                };
                info?: {
                    socials?: {
                        type?: string;
                        url?: string;
                    }[];
                    websites?: {
                        label?: string;
                        url?: string;
                    }[];
                };
            }[];
        }>(url);

        if (result.error) {
            return {
                value: null,
                timestamp: Date.now(),
                source: 'dexscreener',
                available: false,
                metadata: {
                    error: result.error,
                },
            };
        }

        const pairs: DexScreenerPair[] = Array.isArray(result.data) ? result.data : [];

        const matchingPairs = pairs.filter(
            (pair) => pair.baseToken?.address?.toLowerCase() === tokenAddress.toLowerCase(),
        );

        if (matchingPairs.length === 0) {
            return {
                value: null,
                timestamp: Date.now(),
                source: 'dexscreener',
                available: false,
                metadata: {
                    error: 'No DEX Screener market data found for token',
                },
            };
        }

        // Use the most liquid pair as the primary market.
        const primaryPair = matchingPairs.reduce((best, current) => {
            const bestLiquidity = best.liquidity?.usd ?? 0;

            const currentLiquidity = current.liquidity?.usd ?? 0;

            return currentLiquidity > bestLiquidity ? current : best;
        });

        const volume24h = primaryPair.volume?.h24 ?? 0;

        const liquidityUsd = primaryPair.liquidity?.usd ?? 0;

        const buys24h = primaryPair.txns?.h24?.buys ?? 0;

        const sells24h = primaryPair.txns?.h24?.sells ?? 0;

        const transactions24h = buys24h + sells24h;

        const socialLinks = primaryPair.info?.socials ?? [];

        const websiteLinks = primaryPair.info?.websites ?? [];

        /*
         * Component 1: volume relative to liquidity.
         *
         * A token trading a large amount relative to its
         * available liquidity is receiving meaningful market activity.
         */
        const volumeLiquidityRatio = liquidityUsd > 0 ? volume24h / liquidityUsd : 0;

        const volumeScore = Math.min(40, volumeLiquidityRatio * 20);

        /*
         * Component 2: transaction activity.
         *
         * This is intentionally capped so a highly fragmented
         * market cannot dominate the entire attention score.
         */
        const transactionScore = Math.min(35, Math.log10(transactions24h + 1) * 10);

        /*
         * Component 3: public discoverability.
         *
         * Social/website metadata is weak evidence by itself,
         * so it contributes only a small amount.
         */
        const socialScore = Math.min(15, socialLinks.length * 5);

        const websiteScore = websiteLinks.length > 0 ? 10 : 0;

        const attentionScore = Math.min(100, volumeScore + transactionScore + socialScore + websiteScore);

        return {
            value: Number(attentionScore.toFixed(2)),
            timestamp: Date.now(),
            source: 'dexscreener',
            available: true,
            metadata: {
                volume24hUsd: volume24h,
                liquidityUsd,
                volumeLiquidityRatio,
                buys24h,
                sells24h,
                transactions24h,
                socialLinksCount: socialLinks.length,
                websiteLinksCount: websiteLinks.length,
                socialLinks,
                websiteLinks,
                pairAddress: primaryPair.pairAddress,
                dexId: primaryPair.dexId,
                tokenSymbol: primaryPair.baseToken?.symbol,
                tokenName: primaryPair.baseToken?.name,
                observationWindowHours,
                scoring: {
                    volumeScore: Number(volumeScore.toFixed(2)),
                    transactionScore: Number(transactionScore.toFixed(2)),
                    socialScore: Number(socialScore.toFixed(2)),
                    websiteScore,
                },
                note: 'Market-attention signal derived from public DEX Screener volume, transaction activity, and token metadata. It does not represent social-media mention counts or sentiment.',
            },
        };
    } catch (error) {
        return {
            value: null,
            timestamp: Date.now(),
            source: 'dexscreener',
            available: false,
            metadata: {
                error: error instanceof Error ? error.message : String(error),
            },
        };
    }
}

function isValidSolanaAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
        return false;
    }

    if (address.length < 32 || address.length > 44) {
        return false;
    }

    return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}
