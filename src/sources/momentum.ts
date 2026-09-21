import { CONFIG } from '../config/index.js';
import type { SignalValue } from '../types/index.js';
import { httpGet } from '../utils/http.js';

interface DexScreenerPair {
    chainId?: string;
    dexId?: string;
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
    };
    priceChange?: {
        h24?: number;
    };
    liquidity?: {
        usd?: number;
    };
    fdv?: number;
    marketCap?: number;
}

export async function fetchMomentumSignal(
    tokenAddress: string,
    _chain = 'solana',
    _observationWindowHours: number = CONFIG.DEFAULT_OBSERVATION_WINDOW_HOURS,
): Promise<SignalValue> {
    try {
        const url = `${CONFIG.DEXSCREENER_API}/token-pairs/v1/solana/${tokenAddress}`;

        const result = await httpGet<DexScreenerPair[]>(url);

        if (result.error || !result.data || !Array.isArray(result.data) || result.data.length === 0) {
            return {
                value: null,
                timestamp: Date.now(),
                source: 'dexscreener',
                available: false,
                metadata: {
                    error: 'No DEX market data found for token',
                    tokenAddress,
                },
            };
        }

        // Prefer the pair with the highest liquidity.
        const pairs = result.data.filter(
            (pair) => pair.baseToken?.address?.toLowerCase() === tokenAddress.toLowerCase(),
        );

        const candidates = pairs.length > 0 ? pairs : result.data;

        const bestPair = candidates.reduce((best, current) => {
            const bestLiquidity = best.liquidity?.usd ?? 0;
            const currentLiquidity = current.liquidity?.usd ?? 0;

            return currentLiquidity > bestLiquidity ? current : best;
        });

        const priceChange24h = bestPair.priceChange?.h24;

        if (typeof priceChange24h !== 'number') {
            return {
                value: null,
                timestamp: Date.now(),
                source: 'dexscreener',
                available: false,
                metadata: {
                    error: '24h price change unavailable for token',
                    tokenAddress,
                    pairAddress: bestPair.pairAddress,
                },
            };
        }

        return {
            value: priceChange24h,
            timestamp: Date.now(),
            source: 'dexscreener',
            available: true,
            metadata: {
                observationWindowHours: 24,
                priceUsd: bestPair.priceUsd ? Number(bestPair.priceUsd) : undefined,
                priceChange24h,
                volume24hUsd: bestPair.volume?.h24,
                liquidityUsd: bestPair.liquidity?.usd,
                marketCapUsd: bestPair.marketCap,
                fdvUsd: bestPair.fdv,
                dexId: bestPair.dexId,
                pairAddress: bestPair.pairAddress,
                tokenSymbol: bestPair.baseToken?.symbol,
                tokenName: bestPair.baseToken?.name,
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
                tokenAddress,
            },
        };
    }
}
