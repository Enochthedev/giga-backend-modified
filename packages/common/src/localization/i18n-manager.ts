/**
 * Internationalization (i18n) manager for multi-language support
 * Provides translation, formatting, and localization services
 */

import { tenantContext } from '../multi-tenancy/tenant-context';

export interface LocaleConfig {
    code: string; // e.g., 'en-US', 'fr-FR', 'ar-SA'
    name: string; // e.g., 'English (US)', 'Français (France)'
    direction: 'ltr' | 'rtl';
    dateFormat: string;
    timeFormat: string;
    numberFormat: {
        decimal: string;
        thousands: string;
        currency: {
            symbol: string;
            position: 'before' | 'after';
        };
    };
    pluralRules: PluralRule[];
}

export interface PluralRule {
    condition: string; // e.g., 'n === 1', 'n === 0 || n > 1'
    form: string; // e.g., 'one', 'other', 'zero', 'few', 'many'
}

export interface TranslationKey {
    key: string;
    namespace?: string;
    defaultValue?: string;
    interpolation?: Record<string, any>;
    count?: number;
}

export interface TranslationResource {
    [key: string]: string | TranslationResource;
}

export class I18nManager {
    private static instance: I18nManager;
    private translations = new Map<string, Map<string, TranslationResource>>();
    private locales = new Map<string, LocaleConfig>();
    private fallbackLocale = 'en-US';

    static getInstance(): I18nManager {
        if (!I18nManager.instance) {
            I18nManager.instance = new I18nManager();
        }
        return I18nManager.instance;
    }

    /**
     * Initialize i18n with locale configurations
     */
    async initialize(locales: LocaleConfig[]): Promise<void> {
        for (const locale of locales) {
            this.locales.set(locale.code, locale);
            await this.loadTranslations(locale.code);
        }
    }

    /**
     * Load translations for a specific locale
     */
    async loadTranslations(locale: string, namespace?: string): Promise<void> {
        try {
            const tenantId = tenantContext.getCurrentTenantId();
            const translations = await this.fetchTranslations(locale, namespace, tenantId);

            if (!this.translations.has(locale)) {
                this.translations.set(locale, new Map());
            }

            const localeTranslations = this.translations.get(locale)!;

            if (namespace) {
                localeTranslations.set(namespace, translations);
            } else {
                // Load all namespaces
                for (const [ns, trans] of Object.entries(translations)) {
                    localeTranslations.set(ns, trans as TranslationResource);
                }
            }
        } catch (error) {
            console.error(`Failed to load translations for ${locale}:`, error);
        }
    }

    /**
     * Translate a key to the current locale
     */
    translate(keyOrOptions: string | TranslationKey): string {
        const options = typeof keyOrOptions === 'string'
            ? { key: keyOrOptions }
            : keyOrOptions;

        const locale = this.getCurrentLocale();
        const translation = this.getTranslation(locale, options);

        if (translation) {
            return this.interpolate(translation, options.interpolation || {});
        }

        // Fallback to default locale
        if (locale !== this.fallbackLocale) {
            const fallbackTranslation = this.getTranslation(this.fallbackLocale, options);
            if (fallbackTranslation) {
                return this.interpolate(fallbackTranslation, options.interpolation || {});
            }
        }

        // Return default value or key
        return options.defaultValue || options.key;
    }

    /**
     * Translate with pluralization
     */
    translatePlural(key: string, count: number, options: Omit<TranslationKey, 'key' | 'count'> = {}): string {
        const locale = this.getCurrentLocale();
        const localeConfig = this.locales.get(locale);

        if (!localeConfig) {
            return this.translate({ ...options, key });
        }

        const pluralForm = this.getPluralForm(count, localeConfig.pluralRules);
        const pluralKey = `${key}.${pluralForm}`;

        return this.translate({
            ...options,
            key: pluralKey,
            count,
            interpolation: { ...options.interpolation, count }
        });
    }

    /**
     * Format date according to locale
     */
    formatDate(date: Date, format?: string): string {
        const locale = this.getCurrentLocale();
        const localeConfig = this.locales.get(locale);

        const formatString = format || localeConfig?.dateFormat || 'YYYY-MM-DD';

        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
    }

    /**
     * Format time according to locale
     */
    formatTime(date: Date, format?: string): string {
        const locale = this.getCurrentLocale();
        const localeConfig = this.locales.get(locale);

        return new Intl.DateTimeFormat(locale, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(date);
    }

    /**
     * Format number according to locale
     */
    formatNumber(number: number, options: Intl.NumberFormatOptions = {}): string {
        const locale = this.getCurrentLocale();
        return new Intl.NumberFormat(locale, options).format(number);
    }

    /**
     * Format currency according to locale
     */
    formatCurrency(amount: number, currency?: string): string {
        const locale = this.getCurrentLocale();
        const tenant = tenantContext.getCurrentTenant();
        const currencyCode = currency || tenant?.currency || 'USD';

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode
        }).format(amount);
    }

    /**
     * Get current locale from tenant context
     */
    getCurrentLocale(): string {
        const tenant = tenantContext.getCurrentTenant();
        return tenant?.locale || this.fallbackLocale;
    }

    /**
     * Get locale configuration
     */
    getLocaleConfig(locale?: string): LocaleConfig | undefined {
        const localeCode = locale || this.getCurrentLocale();
        return this.locales.get(localeCode);
    }

    /**
     * Check if locale is RTL
     */
    isRTL(locale?: string): boolean {
        const config = this.getLocaleConfig(locale);
        return config?.direction === 'rtl';
    }

    /**
     * Get available locales
     */
    getAvailableLocales(): LocaleConfig[] {
        return Array.from(this.locales.values());
    }

    /**
     * Private methods
     */
    private getTranslation(locale: string, options: TranslationKey): string | null {
        const localeTranslations = this.translations.get(locale);
        if (!localeTranslations) return null;

        const namespace = options.namespace || 'common';
        const namespaceTranslations = localeTranslations.get(namespace);
        if (!namespaceTranslations) return null;

        return this.getNestedValue(namespaceTranslations, options.key);
    }

    private getNestedValue(obj: TranslationResource, path: string): string | null {
        const keys = path.split('.');
        let current: any = obj;

        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return null;
            }
        }

        return typeof current === 'string' ? current : null;
    }

    private interpolate(template: string, values: Record<string, any>): string {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return values[key] !== undefined ? String(values[key]) : match;
        });
    }

    private getPluralForm(count: number, rules: PluralRule[]): string {
        for (const rule of rules) {
            if (this.evaluatePluralCondition(rule.condition, count)) {
                return rule.form;
            }
        }
        return 'other'; // Default plural form
    }

    private evaluatePluralCondition(condition: string, n: number): boolean {
        try {
            // Simple evaluation - in production, use a proper expression evaluator
            return eval(condition.replace(/n/g, n.toString()));
        } catch {
            return false;
        }
    }

    private async fetchTranslations(
        locale: string,
        namespace?: string,
        tenantId?: string
    ): Promise<TranslationResource> {
        // This would fetch from database, file system, or external service
        // For now, return empty object
        return {};
    }
}

// Export singleton instance
export const i18n = I18nManager.getInstance();

// Helper functions for easier usage
export const t = (key: string | TranslationKey, interpolation?: Record<string, any>): string => {
    if (typeof key === 'string') {
        return i18n.translate({ key, interpolation });
    }
    return i18n.translate(key);
};

export const tPlural = (key: string, count: number, interpolation?: Record<string, any>): string => {
    return i18n.translatePlural(key, count, { interpolation });
};

export const formatDate = (date: Date, format?: string): string => {
    return i18n.formatDate(date, format);
};

export const formatCurrency = (amount: number, currency?: string): string => {
    return i18n.formatCurrency(amount, currency);
};

export const formatNumber = (number: number, options?: Intl.NumberFormatOptions): string => {
    return i18n.formatNumber(number, options);
};