// Utility functions for HTTP requests and data processing

import axios from 'axios';

/**
 * Makes an HTTP GET request with error handling
 */
export async function httpGet<T>(url: string, config: any = {}): Promise<{ data: T; error?: string }> {
  try {
    const response = await axios.get<T>(url, {
      timeout: 10000, // 10 second timeout
      ...config,
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: null as unknown as T,
      error: error.response?.data?.message || error.message || 'Unknown error',
    };
  }
}

/**
 * Makes an HTTP POST request with error handling
 */
export async function httpPost<T>(url: string, data: any, config: any = {}): Promise<{ data: T; error?: string }> {
  try {
    const response = await axios.post<T>(url, data, {
      timeout: 10000,
      ...config,
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: null as unknown as T,
      error: error.response?.data?.message || error.message || 'Unknown error',
    };
  }
}

/**
 * Normalizes a value to a 0-100 scale based on thresholds
 */
export function normalizeValue(
  value: number | null,
  thresholds: { low: number; medium: number; high: number },
  reverse = false
): number | null {
  if (value === null) return null;

  // For metrics where higher is better (like liquidity)
  if (!reverse) {
    if (value >= thresholds.high) return 100;
    if (value >= thresholds.medium) return 50 + ((value - thresholds.medium) / (thresholds.high - thresholds.medium)) * 50;
    if (value >= thresholds.low) return ((value - thresholds.low) / (thresholds.medium - thresholds.low)) * 50;
    return 0;
  }
  // For metrics where lower is better (like risk)
  
    if (value <= thresholds.low) return 100;
    if (value <= thresholds.medium) return 50 + ((thresholds.medium - value) / (thresholds.medium - thresholds.low)) * 50;
    if (value <= thresholds.high) return ((thresholds.high - value) / (thresholds.high - thresholds.medium)) * 50;
    return 0;
  
}

/**
 * Calculates percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Sleeps for specified milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validates a Solana address format
 */
export function isValidSolanaAddress(address: string): boolean {
  // Basic validation - Solana addresses are 32-44 characters, base58
  if (!address || typeof address !== 'string') return false;
  if (address.length < 32 || address.length > 44) return false;
  // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
}