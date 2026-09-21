// Holder signal collector - current unique token holders from Solana RPC

import { CONFIG } from '../config/index.js';
import type { SignalValue } from '../types/index.js';
import { httpPost } from '../utils/http.js';

interface TokenAccount {
    pubkey: string;
    account?: {
        data?: {
            parsed?: {
                info?: {
                    mint?: string;
                    owner?: string;
                    tokenAmount?: {
                        uiAmount?: number | null;
                    };
                };
            };
        };
    };
}

const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

export async function fetchHoldersSignal(
    tokenAddress: string,
    _chain = 'solana',
    _observationWindowHours: number = CONFIG.DEFAULT_OBSERVATION_WINDOW_HOURS,
): Promise<SignalValue> {
    try {
        if (!isValidSolanaAddress(tokenAddress)) {
            return {
                value: null,
                timestamp: Date.now(),
                source: 'solana-rpc',
                available: false,
                metadata: {
                    error: 'Invalid token address format',
                },
            };
        }

        const solanaRpcUrl = CONFIG.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

        // First determine which program owns the token mint.
        const mintInfoPayload = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getAccountInfo',
            params: [
                tokenAddress,
                {
                    encoding: 'jsonParsed',
                },
            ],
        };

        const mintInfoResult = await httpPost<{
            result?: {
                value?: {
                    owner?: string;
                    data?: {
                        parsed?: {
                            info?: {
                                decimals?: number;
                            };
                        };
                    };
                } | null;
            };
        }>(solanaRpcUrl, mintInfoPayload);

        if (mintInfoResult.error || !mintInfoResult.data?.result?.value) {
            return {
                value: null,
                timestamp: Date.now(),
                source: 'solana-rpc',
                available: false,
                metadata: {
                    error: mintInfoResult.error || 'Token mint account not found',
                },
            };
        }

        const mintOwner = mintInfoResult.data.result.value.owner;

        let tokenProgramId: string;

        if (mintOwner === SPL_TOKEN_PROGRAM_ID) {
            tokenProgramId = SPL_TOKEN_PROGRAM_ID;
        } else if (mintOwner === TOKEN_2022_PROGRAM_ID) {
            tokenProgramId = TOKEN_2022_PROGRAM_ID;
        } else {
            return {
                value: null,
                timestamp: Date.now(),
                source: 'solana-rpc',
                available: false,
                metadata: {
                    error: 'Unsupported token program',
                    mintOwner,
                    supportedPrograms: [SPL_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID],
                },
            };
        }

        const rpcPayload = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getProgramAccounts',
            params: [
                tokenProgramId,
                {
                    encoding: 'jsonParsed',
                    filters: [
                        {
                            memcmp: {
                                offset: 0,
                                bytes: tokenAddress,
                            },
                        },
                    ],
                },
            ],
        };

        const rpcResult = await httpPost<{
            result?: {
                value?: {
                    pubkey?: string;
                    account?: {
                        data?: {
                            parsed?: {
                                info?: {
                                    owner?: string;
                                    tokenAmount?: {
                                        amount?: string;
                                        decimals?: number;
                                        uiAmount?: number | null;
                                    };
                                };
                            };
                        };
                    };
                }[];
            };
        }>(solanaRpcUrl, rpcPayload);

        if (rpcResult.error) {
            return {
                value: null,
                timestamp: Date.now(),
                source: 'solana-rpc',
                available: false,
                metadata: {
                    error: rpcResult.error,
                    tokenProgramId,
                    mintOwner,
                },
            };
        }

        const accounts: TokenAccount[] = Array.isArray(rpcResult.data?.result) ? rpcResult.data.result : [];

        const holderAddresses = new Set<string>();

        let accountsWithBalance = 0;
        let totalTokenAccounts = 0;

        for (const account of accounts) {
            totalTokenAccounts++;

            const info = account.account?.data?.parsed?.info;

            if (!info) {
                continue;
            }

            const balance = info.tokenAmount?.uiAmount;

            if (typeof balance === 'number' && balance > 0 && typeof info.owner === 'string') {
                accountsWithBalance++;
                holderAddresses.add(info.owner);
            }
        }

        const holderCount = holderAddresses.size;

        return {
            value: holderCount,
            timestamp: Date.now(),
            source: 'solana-rpc',
            available: true,
            metadata: {
                holderCount,
                totalTokenAccounts,
                accountsWithBalance,
                tokenProgramId,
                mintOwner,
                note: 'Current unique token holders derived from Solana token accounts. Historical holder change is not measured.',
            },
        };
    } catch (error) {
        return {
            value: null,
            timestamp: Date.now(),
            source: 'solana-rpc',
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
