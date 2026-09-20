// Liquidity signal collector - tracks trading volume as a proxy for liquidity

import { httpGet } from '../utils/http.js';
import { SignalValue } from '../types/index.js';
import { CONFIG } from '../config/index.js';

/**
 * Fetches liquidity proxy data for a token
 * Uses CoinGecko API which provides total trading volume (as proxy for liquidity/activity)
 * NOTE: This is trading volume, not on-chain liquidity. For true DEX liquidity,
 * blockchain analysis or specialized APIs would be required.
 */
export async function fetchLiquiditySignal(
  tokenAddress: string,
  _chain: string = 'solana'
): Promise<SignalValue> {
  try {
    // First, we need to get the CoinGecko ID for the token address
    // For simplicity in this implementation, we'll use a mapping for known tokens
    // In a production system, we'd use a token registry or lookup service
    let coingeckoId = 'solana'; // Default to SOL

    // For now, we'll handle SOL specifically and note that other tokens would need a lookup
    if (tokenAddress.toLowerCase() === 'so11111111111111111111111111111111111111112') {
      coingeckoId = 'solana';
    }
    // Add more known token mappings as needed for the demo

    // Use CoinGecko API (no key required for basic endpoints)
    const coingeckoUrl = `${CONFIG.COINGECKO_API}/coins/${coingeckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    const coingeckoResult = await httpGet<any>(coingeckoUrl);

    if (!coingeckoResult.error && coingeckoResult.data && coingeckoResult.data.market_data) {
      const data = coingeckoResult.data.market_data;
      // CoinGecko provides total_volume - we'll use this as a proxy for liquidity/activity
      // NOTE: This is trading volume from exchanges, not on-chain DEX liquidity
      if (data.total_volume?.usd !== undefined) {
        return {
          value: data.total_volume.usd,
          timestamp: Date.now(),
          source: 'coingecko',
          available: true,
          metadata: {
            volume24hUsd: data.total_volume.usd,
            marketCapUsd: data.market_cap?.usd,
            priceUsd: data.current_price?.usd,
            note: 'This is 24h trading volume from exchanges, not on-chain DEX liquidity'
          }
        };
      }
    }

    // If we couldn't get data from CoinGecko
    return {
      value: null,
      timestamp: Date.now(),
      source: 'liquidity',
      available: false,
      metadata: { error: 'Failed to fetch liquidity data from CoinGecko' }
    };
  } catch (error) {
    return {
      value: null,
      timestamp: Date.now(),
      source: 'liquidity',
      available: false,
      metadata: {
  error: error instanceof Error ? error.message : String(error),
}
    };
  }
}