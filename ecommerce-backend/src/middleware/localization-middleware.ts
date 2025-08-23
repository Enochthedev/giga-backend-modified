/**
 * Localization middleware for ecommerce service
 * Handles currency conversion, content localization, and regional adaptations
 */

import { Request, Response, NextFunction } from 'express';
import { i18n, currencyService, regionConfig, contentManager } from '@common/localization';
import { tenantContext } from '@common/multi-tenancy';

export interface LocalizedRequest extends Request {
    locale?: string;
    region?: string;
    currency?: string;
    t?: (key: string, interpolation?: Record<string, any>) => string;
    formatCurrency?: (amount: number, currency?: string) => string;
    formatDate?: (date: Date, format?: string) => string;
}

/**
 * Middleware to set up localization context
 */
export async function setupLocalization(req: LocalizedRequest, res: Response, next: NextFunction) {
    try {
        // Get locale and region from tenant context or request headers
        const tenant = tenantContext.getCurrentTenant();
        const locale = req.headers['accept-language'] || tenant?.locale || 'en-US';
        const region = tenant?.region || 'US';
        const currency = tenant?.currency || 'USD';

        // Set localization context on request
        req.locale = locale;
        req.region = region;
        req.currency = currency;

        // Add helper functions to request
        req.t = (key: string, interpolation?: Record<string, any>) => {
            return i18n.translate({ key, interpolation });
        };

        req.formatCurrency = (amount: number, curr?: string) => {
            return currencyService.formatCurrency(amount, curr || currency);
        };

        req.formatDate = (date: Date, format?: string) => {
            return i18n.formatDate(date, format);
        };

        // Set response headers for localization
        res.setHeader('Content-Language', locale);
        res.setHeader('X-Currency', currency);
        res.setHeader('X-Region', region);

        next();
    } catch (error) {
        console.error('Localization setup failed:', error);
        next(); // Continue without localization
    }
}

/**
 * Middleware to convert prices to tenant currency
 */
export async function convertPrices(req: LocalizedRequest, res: Response, next: NextFunction) {
    try {
        const originalSend = res.json;

        res.json = function (data: any) {
            if (data && req.currency) {
                const convertedData = convertPricesInData(data, req.currency);
                return originalSend.call(this, convertedData);
            }
            return originalSend.call(this, data);
        };

        next();
    } catch (error) {
        console.error('Price conversion failed:', error);
        next();
    }
}

/**
 * Middleware to localize content in responses
 */
export async function localizeContent(req: LocalizedRequest, res: Response, next: NextFunction) {
    try {
        const originalSend = res.json;

        res.json = function (data: any) {
            if (data && req.locale) {
                const localizedData = localizeDataContent(data, req.locale, req.region);
                return originalSend.call(this, localizedData);
            }
            return originalSend.call(this, data);
        };

        next();
    } catch (error) {
        console.error('Content localization failed:', error);
        next();
    }
}

/**
 * Middleware to apply regional business rules
 */
export async function applyRegionalRules(req: LocalizedRequest, res: Response, next: NextFunction) {
    try {
        const region = req.region || 'US';
        const regionalConfig = regionConfig.getRegionConfig(region);

        // Add regional config to request for use in controllers
        (req as any).regionalConfig = regionalConfig;

        // Apply regional validation rules
        if (req.method === 'POST' || req.method === 'PUT') {
            const validationResult = validateRegionalCompliance(req.body, regionalConfig);
            if (!validationResult.valid) {
                return res.status(400).json({
                    error: 'Regional compliance validation failed',
                    details: validationResult.errors
                });
            }
        }

        next();
    } catch (error) {
        console.error('Regional rules application failed:', error);
        next();
    }
}

/**
 * Helper function to convert prices in data structure
 */
function convertPricesInData(data: any, targetCurrency: string): any {
    if (!data) return data;

    if (Array.isArray(data)) {
        return data.map(item => convertPricesInData(item, targetCurrency));
    }

    if (typeof data === 'object') {
        const converted = { ...data };

        // Convert price fields
        const priceFields = ['price', 'amount', 'total', 'subtotal', 'tax', 'shipping', 'discount'];

        for (const field of priceFields) {
            if (converted[field] && typeof converted[field] === 'number') {
                // In a real implementation, you would use currencyService.convert()
                // For now, we'll just mark it as converted
                converted[`${field}_original`] = converted[field];
                converted[`${field}_currency`] = targetCurrency;
            }
        }

        // Recursively convert nested objects
        for (const [key, value] of Object.entries(converted)) {
            if (typeof value === 'object' && value !== null) {
                converted[key] = convertPricesInData(value, targetCurrency);
            }
        }

        return converted;
    }

    return data;
}

/**
 * Helper function to localize content in data structure
 */
function localizeDataContent(data: any, locale: string, region?: string): any {
    if (!data) return data;

    if (Array.isArray(data)) {
        return data.map(item => localizeDataContent(item, locale, region));
    }

    if (typeof data === 'object') {
        const localized = { ...data };

        // Localize text fields
        const textFields = ['name', 'title', 'description', 'message', 'label'];

        for (const field of textFields) {
            if (localized[field] && typeof localized[field] === 'string') {
                // In a real implementation, you would use i18n.translate()
                // For now, we'll just mark it as localized
                localized[`${field}_locale`] = locale;
            }
        }

        // Recursively localize nested objects
        for (const [key, value] of Object.entries(localized)) {
            if (typeof value === 'object' && value !== null) {
                localized[key] = localizeDataContent(value, locale, region);
            }
        }

        return localized;
    }

    return data;
}

/**
 * Helper function to validate regional compliance
 */
function validateRegionalCompliance(data: any, regionalConfig: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Example validation rules
    if (regionalConfig.compliance.ageVerification.required) {
        if (data.age && data.age < regionalConfig.compliance.ageVerification.minimumAge) {
            errors.push(`Minimum age requirement not met for region ${regionalConfig.code}`);
        }
    }

    if (regionalConfig.taxSettings.taxIdRequired) {
        if (data.businessInfo && !data.businessInfo.taxId) {
            errors.push('Tax ID is required for business accounts in this region');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Combined localization middleware stack
 */
export const localizationMiddleware = [
    setupLocalization,
    convertPrices,
    localizeContent,
    applyRegionalRules
];