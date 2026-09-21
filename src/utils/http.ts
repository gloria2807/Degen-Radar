import axios from 'axios';

export interface HttpResponse<T> {
    data: T;
    error?: string;
}

function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message ?? error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'Unknown error';
}

export async function httpGet<T>(url: string, config: Record<string, unknown> = {}): Promise<HttpResponse<T>> {
    try {
        const response = await axios.get<T>(url, {
            timeout: 10000,
            ...config,
        });

        return { data: response.data };
    } catch (error: unknown) {
        const message = getErrorMessage(error);

        return {
            data: null as unknown as T,
            error: message,
        };
    }
}

export async function httpPost<T>(
    url: string,
    data: unknown,
    config: Record<string, unknown> = {},
): Promise<HttpResponse<T>> {
    try {
        const response = await axios.post<T>(url, data, {
            timeout: 10000,
            ...config,
        });

        return { data: response.data };
    } catch (error: unknown) {
        const message = getErrorMessage(error);

        return {
            data: null as unknown as T,
            error: message,
        };
    }
}

export function normalizeValue(
    value: number | null,
    thresholds: { low: number; medium: number; high: number },
    reverse = false,
): number | null {
    if (value === null) return null;

    if (!reverse) {
        if (value >= thresholds.high) return 100;

        if (value >= thresholds.medium) {
            return 50 + ((value - thresholds.medium) / (thresholds.high - thresholds.medium)) * 50;
        }

        if (value >= thresholds.low) {
            return ((value - thresholds.low) / (thresholds.medium - thresholds.low)) * 50;
        }

        return 0;
    }

    if (value <= thresholds.low) return 100;

    if (value <= thresholds.medium) {
        return 50 + ((thresholds.medium - value) / (thresholds.medium - thresholds.low)) * 50;
    }

    if (value <= thresholds.high) {
        return ((thresholds.high - value) / (thresholds.high - thresholds.medium)) * 50;
    }

    return 0;
}

export function calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;

    return ((current - previous) / previous) * 100;
}

export async function sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function isValidSolanaAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    if (address.length < 32 || address.length > 44) return false;

    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(address);
}
