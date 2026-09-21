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

export async function fetchLiquiditySignal(tokenAddress: string, _chain = 'solana'): Promise<SignalValue> {
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

        const pairs = result.data.filter(
            (pair) => pair.baseToken?.address?.toLowerCase() === tokenAddress.toLowerCase(),
        );

        const candidates = pairs.length > 0 ? pairs : result.data;

        const bestPair = candidates.reduce((best, current) => {
            const bestLiquidity = best.liquidity?.usd ?? 0;
            const currentLiquidity = current.liquidity?.usd ?? 0;

            return currentLiquidity > bestLiquidity ? current : best;
        });

        const liquidityUsd = bestPair.liquidity?.usd;

        if (typeof liquidityUsd !== 'number') {
            return {
                value: null,
                timestamp: Date.now(),
                source: 'dexscreener',
                available: false,
                metadata: {
                    error: 'Liquidity data unavailable for token',
                    tokenAddress,
                    pairAddress: bestPair.pairAddress,
                },
            };
        }

        return {
            value: liquidityUsd,
            timestamp: Date.now(),
            source: 'dexscreener',
            available: true,
            metadata: {
                liquidityUsd,
                volume24hUsd: bestPair.volume?.h24,
                priceUsd: bestPair.priceUsd ? Number(bestPair.priceUsd) : undefined,
                marketCapUsd: bestPair.marketCap,
                fdvUsd: bestPair.fdv,
                dexId: bestPair.dexId,
                pairAddress: bestPair.pairAddress,
                tokenSymbol: bestPair.baseToken?.symbol,
                tokenName: bestPair.baseToken?.name,
                note: 'Liquidity is DEX pool liquidity in USD',
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
