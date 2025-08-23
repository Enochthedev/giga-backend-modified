/**
 * Currency conversion and multi-currency support service
 */

import { tenantContext } from '../multi-tenancy/tenant-context';

export interface CurrencyInfo {
    code: string; // ISO 4217 currency code (e.g., 'USD', 'EUR', 'NGN')
    name: string;
    symbol: string;
    decimals: number;
    symbolPosition: 'before' | 'after';
    thousandsSeparator: string;
    decimalSeparator: string;
}

export interface ExchangeRate {
    from: string;
    to: string;
    rate: number;
    timestamp: Date;
    source: string;
}

export interface ConversionResult {
    originalAmount: number;
    originalCurrency: string;
    convertedAmount: number;
    convertedCurrency: string;
    exchangeRate: number;
    timestamp: Date;
}

export class CurrencyService {
    private static instance: CurrencyService;
    private currencies = new Map<string, CurrencyInfo>();
    private exchangeRates = new Map<string, ExchangeRate>();
    private baseCurrency = 'USD';
    private cacheTimeout = 15 * 60 * 1000; // 15 minutes

    static getInstance(): CurrencyService {
        if (!CurrencyService.instance) {
            CurrencyService.instance = new CurrencyService();
        }
        return CurrencyService.instance;
    }

    /**
     * Initialize currency service with supported currencies
     */
    async initialize(): Promise<void> {
        await this.loadSupportedCurrencies();
        await this.loadExchangeRates();

        // Set up periodic rate updates
        setInterval(() => {
            this.loadExchangeRates();
        }, this.cacheTimeout);
    }

    /**
     * Convert amount from one currency to another
     */
    async convert(
        amount: number,
        fromCurrency: string,
        toCurrency?: string
    ): Promise<ConversionResult> {
        const targetCurrency = toCurrency || this.getTenantCurrency();

        if (fromCurrency === targetCurrency) {
            return {
                originalAmount: amount,
                originalCurrency: fromCurrency,
                convertedAmount: amount,
                convertedCurrency: targetCurrency,
                exchangeRate: 1,
                timestamp: new Date()
            };
        }

        const rate = await this.getExchangeRate(fromCurrency, targetCurrency);
        const convertedAmount = amount * rate.rate;

        return {
            originalAmount: amount,
            originalCurrency: fromCurrency,
            convertedAmount: this.roundCurrency(convertedAmount, targetCurrency),
            convertedCurrency: targetCurrency,
            exchangeRate: rate.rate,
            timestamp: rate.timestamp
        };
    }

    /**
     * Get exchange rate between two currencies
     */
    async getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
        const rateKey = `${from}-${to}`;
        let rate = this.exchangeRates.get(rateKey);

        if (!rate || this.isRateExpired(rate)) {
            rate = await this.fetchExchangeRate(from, to);
            this.exchangeRates.set(rateKey, rate);
        }

        return rate;
    }

    /**
     * Format currency amount according to currency rules
     */
    formatCurrency(amount: number, currency?: string): string {
        const currencyCode = currency || this.getTenantCurrency();
        const currencyInfo = this.currencies.get(currencyCode);

        if (!currencyInfo) {
            return `${amount} ${currencyCode}`;
        }

        const roundedAmount = this.roundCurrency(amount, currencyCode);
        const formattedAmount = this.formatNumber(roundedAmount, currencyInfo);

        if (currencyInfo.symbolPosition === 'before') {
            return `${currencyInfo.symbol}${formattedAmount}`;
        } else {
            return `${formattedAmount} ${currencyInfo.symbol}`;
        }
    }

    /**
     * Get currency information
     */
    getCurrencyInfo(currency: string): CurrencyInfo | undefined {
        return this.currencies.get(currency);
    }

    /**
     * Get supported currencies
     */
    getSupportedCurrencies(): CurrencyInfo[] {
        return Array.from(this.currencies.values());
    }

    /**
     * Get tenant's default currency
     */
    getTenantCurrency(): string {
        const tenant = tenantContext.getCurrentTenant();
        return tenant?.currency || this.baseCurrency;
    }

    /**
     * Check if currency is supported
     */
    isCurrencySupported(currency: string): boolean {
        return this.currencies.has(currency);
    }

    /**
     * Get currency by region
     */
    getCurrencyByRegion(region: string): string {
        const regionCurrencyMap: Record<string, string> = {
            'US': 'USD',
            'EU': 'EUR',
            'GB': 'GBP',
            'NG': 'NGN',
            'KE': 'KES',
            'ZA': 'ZAR',
            'EG': 'EGP',
            'IN': 'INR',
            'CN': 'CNY',
            'JP': 'JPY',
            'AU': 'AUD',
            'CA': 'CAD',
            'BR': 'BRL',
            'MX': 'MXN',
            'AE': 'AED',
            'SA': 'SAR'
        };

        return regionCurrencyMap[region] || this.baseCurrency;
    }

    /**
     * Private methods
     */
    private async loadSupportedCurrencies(): Promise<void> {
        const currencies: CurrencyInfo[] = [
            {
                code: 'USD',
                name: 'US Dollar',
                symbol: '$',
                decimals: 2,
                symbolPosition: 'before',
                thousandsSeparator: ',',
                decimalSeparator: '.'
            },
            {
                code: 'EUR',
                name: 'Euro',
                symbol: '€',
                decimals: 2,
                symbolPosition: 'before',
                thousandsSeparator: '.',
                decimalSeparator: ','
            },
            {
                code: 'GBP',
                name: 'British Pound',
                symbol: '£',
                decimals: 2,
                symbolPosition: 'before',
                thousandsSeparator: ',',
                decimalSeparator: '.'
            },
            {
                code: 'NGN',
                name: 'Nigerian Naira',
                symbol: '₦',
                decimals: 2,
                symbolPosition: 'before',
                thousandsSeparator: ',',
                decimalSeparator: '.'
            },
            {
                code: 'KES',
                name: 'Kenyan Shilling',
                symbol: 'KSh',
                decimals: 2,
                symbolPosition: 'before',
                thousandsSeparator: ',',
                decimalSeparator: '.'
            },
            {
                code: 'ZAR',
                name: 'South African Rand',
                symbol: 'R',
                decimals: 2,
                symbolPosition: 'before',
                thousandsSeparator: ',',
                decimalSeparator: '.'
            },
            {
                code: 'EGP',
                name: 'Egyptian Pound',
                symbol: 'E£',
                decimals: 2,
                symbolPosition: 'before',
                thousandsSeparator: ',',
                decimalSeparator: '.'
            },
            {
                code: 'AED',
                name: 'UAE Dirham',
                symbol: 'د.إ',
                decimals: 2,
                symbolPosition: 'after',
                thousandsSeparator: ',',
                decimalSeparator: '.'
            },
            {
                code: 'SAR',
                name: 'Saudi Riyal',
                symbol: 'ر.س',
                decimals: 2,
                symbolPosition: 'after',
                thousandsSeparator: ',',
                decimalSeparator: '.'
            }
        ];

        for (const currency of currencies) {
            this.currencies.set(currency.code, currency);
        }
    }

    private async loadExchangeRates(): Promise<void> {
        try {
            // In production, this would fetch from a real exchange rate API
            // For now, we'll use mock rates
            const mockRates = await this.fetchMockExchangeRates();

            for (const rate of mockRates) {
                const key = `${rate.from}-${rate.to}`;
                this.exchangeRates.set(key, rate);
            }
        } catch (error) {
            console.error('Failed to load exchange rates:', error);
        }
    }

    private async fetchExchangeRate(from: string, to: string): Promise<ExchangeRate> {
        try {
            // In production, integrate with services like:
            // - Fixer.io
            // - CurrencyLayer
            // - Open Exchange Rates
            // - Central bank APIs

            // Mock implementation
            const rate = Math.random() * 2 + 0.5; // Random rate between 0.5 and 2.5

            return {
                from,
                to,
                rate,
                timestamp: new Date(),
                source: 'mock-api'
            };
        } catch (error) {
            console.error(`Failed to fetch exchange rate ${from}-${to}:`, error);
            throw new Error(`Exchange rate not available for ${from} to ${to}`);
        }
    }

    private async fetchMockExchangeRates(): Promise<ExchangeRate[]> {
        const baseCurrency = 'USD';
        const currencies = ['EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'EGP', 'AED', 'SAR'];
        const rates: ExchangeRate[] = [];

        // Mock rates relative to USD
        const mockRates: Record<string, number> = {
            'EUR': 0.85,
            'GBP': 0.73,
            'NGN': 460.0,
            'KES': 110.0,
            'ZAR': 18.5,
            'EGP': 30.8,
            'AED': 3.67,
            'SAR': 3.75
        };

        for (const currency of currencies) {
            // USD to other currency
            rates.push({
                from: baseCurrency,
                to: currency,
                rate: mockRates[currency],
                timestamp: new Date(),
                source: 'mock-api'
            });

            // Other currency to USD
            rates.push({
                from: currency,
                to: baseCurrency,
                rate: 1 / mockRates[currency],
                timestamp: new Date(),
                source: 'mock-api'
            });
        }

        return rates;
    }

    private isRateExpired(rate: ExchangeRate): boolean {
        const now = new Date();
        const rateAge = now.getTime() - rate.timestamp.getTime();
        return rateAge > this.cacheTimeout;
    }

    private roundCurrency(amount: number, currency: string): number {
        const currencyInfo = this.currencies.get(currency);
        const decimals = currencyInfo?.decimals || 2;
        return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    private formatNumber(amount: number, currencyInfo: CurrencyInfo): string {
        const parts = amount.toFixed(currencyInfo.decimals).split('.');
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currencyInfo.thousandsSeparator);
        const decimalPart = parts[1];

        if (decimalPart && parseInt(decimalPart) > 0) {
            return `${integerPart}${currencyInfo.decimalSeparator}${decimalPart}`;
        }

        return integerPart;
    }
}

// Export singleton instance
export const currencyService = CurrencyService.getInstance();