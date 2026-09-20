// Momentum signal collector - tracks price changes

import { httpGet } from '../utils/http.js';
import { SignalValue } from '../types/index.js';
import { CONFIG } from '../config/index.js';

/**
 * Fetches price data for a token and calculates momentum
 * Uses CoinGecko API which provides 24h price change directly
 */
export async function fetchMomentumSignal(
  tokenAddress: string,
  _chain: string = 'solana',
  _observationWindowHours: number = CONFIG.DEFAULT_OBSERVATION_WINDOW_HOURS
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
      // CoinGecko provides price_change_24h directly as a percentage - this is real data
      if (data.price_change_24h !== undefined) {
        return {
          value: data.price_change_24h,
          timestamp: Date.now(),
          source: 'coingecko',
          available: true,
          metadata: {
            observationWindowHours: 24, // Fixed to 24h to match CoinGecko's data
            priceUsd: data.current_price?.usd,
            priceChange24h: data.price_change_24h,
            marketCapUsd: data.market_cap?.usd,
            totalVolumeUsd: data.total_volume?.usd
          }
        };
      }
    }

    // If we couldn't get data from CoinGecko
    return {
      value: null,
      timestamp: Date.now(),
      source: 'momentum',
      available: false,
      metadata: { error: 'Failed to fetch price data from CoinGecko' }
    };
  } catch (error) {
    return {
      value: null,
      timestamp: Date.now(),
      source: 'momentum',
      available: false,
      metadata: {
  error: error instanceof Error ? error.message : String(error),
}
    };
  }
}