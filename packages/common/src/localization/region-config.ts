/**
 * Region-specific configuration management
 * Handles regional settings, compliance, and cultural adaptations
 */

import { tenantContext } from '../multi-tenancy/tenant-context';

export interface RegionConfig {
    code: string; // ISO 3166-1 alpha-2 country code
    name: string;
    continent: string;
    timezone: string;
    currency: string;
    locale: string;
    dateFormat: string;
    timeFormat: string;
    weekStart: number; // 0 = Sunday, 1 = Monday
    businessDays: number[]; // Array of business days (0-6)
    businessHours: {
        start: string; // HH:mm format
        end: string;
    };
    phoneFormat: string;
    addressFormat: AddressFormat;
    taxSettings: TaxSettings;
    paymentMethods: PaymentMethodConfig[];
    compliance: ComplianceSettings;
    cultural: CulturalSettings;
}

export interface AddressFormat {
    fields: AddressField[];
    format: string; // Template for displaying address
    postalCodeRegex?: string;
    phoneRegex?: string;
}

export interface AddressField {
    name: string;
    label: string;
    required: boolean;
    type: 'text' | 'select' | 'number';
    options?: string[]; // For select fields
    placeholder?: string;
}

export interface TaxSettings {
    enabled: boolean;
    type: 'vat' | 'gst' | 'sales_tax' | 'none';
    rate: number; // Default tax rate as percentage
    inclusive: boolean; // Whether prices include tax
    taxIdRequired: boolean;
    taxIdFormat?: string;
    exemptions: string[]; // Categories exempt from tax
}

export interface PaymentMethodConfig {
    provider: string;
    name: string;
    enabled: boolean;
    currencies: string[];
    fees: {
        fixed?: number;
        percentage?: number;
    };
    limits: {
        min?: number;
        max?: number;
        daily?: number;
    };
    settings: Record<string, any>;
}

export interface ComplianceSettings {
    gdpr: boolean; // EU GDPR compliance required
    ccpa: boolean; // California Consumer Privacy Act
    pipeda: boolean; // Personal Information Protection and Electronic Documents Act (Canada)
    lgpd: boolean; // Lei Geral de Proteção de Dados (Brazil)
    dataRetention: {
        user: number; // Days to retain user data
        transaction: number; // Days to retain transaction data
        logs: number; // Days to retain log data
    };
    cookieConsent: boolean;
    ageVerification: {
        required: boolean;
        minimumAge: number;
    };
    kycRequired: boolean; // Know Your Customer verification
    amlRequired: boolean; // Anti-Money Laundering compliance
}

export interface CulturalSettings {
    rtl: boolean; // Right-to-left text direction
    colorPreferences: {
        primary: string;
        secondary: string;
        success: string;
        warning: string;
        danger: string;
    };
    imagery: {
        style: 'western' | 'local' | 'neutral';
        restrictions: string[]; // Content restrictions
    };
    communication: {
        formalityLevel: 'formal' | 'informal' | 'mixed';
        greetingStyle: string;
        contactPreferences: string[]; // Preferred contact methods
    };
    holidays: Holiday[];
    workingCalendar: {
        weekends: number[]; // Weekend days (0-6)
        specialDays: SpecialDay[];
    };
}

export interface Holiday {
    name: string;
    date: string; // MM-DD format or specific date
    type: 'national' | 'religious' | 'cultural';
    recurring: boolean;
}

export interface SpecialDay {
    name: string;
    date: string;
    type: 'holiday' | 'half_day' | 'special_hours';
    businessHours?: {
        start: string;
        end: string;
    };
}

export class RegionConfigManager {
    private static instance: RegionConfigManager;
    private regions = new Map<string, RegionConfig>();
    private defaultRegion = 'US';

    static getInstance(): RegionConfigManager {
        if (!RegionConfigManager.instance) {
            RegionConfigManager.instance = new RegionConfigManager();
        }
        return RegionConfigManager.instance;
    }

    /**
     * Initialize region configurations
     */
    async initialize(): Promise<void> {
        await this.loadRegionConfigs();
    }

    /**
     * Get region configuration
     */
    getRegionConfig(regionCode?: string): RegionConfig {
        const region = regionCode || this.getCurrentRegion();
        return this.regions.get(region) || this.regions.get(this.defaultRegion)!;
    }

    /**
     * Get current region from tenant context
     */
    getCurrentRegion(): string {
        const tenant = tenantContext.getCurrentTenant();
        return tenant?.region || this.defaultRegion;
    }

    /**
     * Get supported regions
     */
    getSupportedRegions(): RegionConfig[] {
        return Array.from(this.regions.values());
    }

    /**
     * Check if region is supported
     */
    isRegionSupported(regionCode: string): boolean {
        return this.regions.has(regionCode);
    }

    /**
     * Get region-specific payment methods
     */
    getPaymentMethods(regionCode?: string): PaymentMethodConfig[] {
        const config = this.getRegionConfig(regionCode);
        return config.paymentMethods.filter(method => method.enabled);
    }

    /**
     * Get tax settings for region
     */
    getTaxSettings(regionCode?: string): TaxSettings {
        const config = this.getRegionConfig(regionCode);
        return config.taxSettings;
    }

    /**
     * Get compliance requirements for region
     */
    getComplianceSettings(regionCode?: string): ComplianceSettings {
        const config = this.getRegionConfig(regionCode);
        return config.compliance;
    }

    /**
     * Get cultural settings for region
     */
    getCulturalSettings(regionCode?: string): CulturalSettings {
        const config = this.getRegionConfig(regionCode);
        return config.cultural;
    }

    /**
     * Check if business is open at given time
     */
    isBusinessOpen(date: Date, regionCode?: string): boolean {
        const config = this.getRegionConfig(regionCode);
        const dayOfWeek = date.getDay();

        // Check if it's a business day
        if (!config.businessDays.includes(dayOfWeek)) {
            return false;
        }

        // Check business hours
        const currentTime = date.toTimeString().substr(0, 5); // HH:mm format
        return currentTime >= config.businessHours.start && currentTime <= config.businessHours.end;
    }

    /**
     * Get next business day
     */
    getNextBusinessDay(date: Date, regionCode?: string): Date {
        const config = this.getRegionConfig(regionCode);
        const nextDay = new Date(date);

        do {
            nextDay.setDate(nextDay.getDate() + 1);
        } while (!config.businessDays.includes(nextDay.getDay()));

        return nextDay;
    }

    /**
     * Format address according to region
     */
    formatAddress(address: Record<string, string>, regionCode?: string): string {
        const config = this.getRegionConfig(regionCode);
        let formatted = config.addressFormat.format;

        for (const [key, value] of Object.entries(address)) {
            formatted = formatted.replace(`{${key}}`, value || '');
        }

        // Clean up extra spaces and newlines
        return formatted.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
    }

    /**
     * Validate postal code for region
     */
    validatePostalCode(postalCode: string, regionCode?: string): boolean {
        const config = this.getRegionConfig(regionCode);
        if (!config.addressFormat.postalCodeRegex) return true;

        const regex = new RegExp(config.addressFormat.postalCodeRegex);
        return regex.test(postalCode);
    }

    /**
     * Validate phone number for region
     */
    validatePhoneNumber(phoneNumber: string, regionCode?: string): boolean {
        const config = this.getRegionConfig(regionCode);
        if (!config.addressFormat.phoneRegex) return true;

        const regex = new RegExp(config.addressFormat.phoneRegex);
        return regex.test(phoneNumber);
    }

    /**
     * Private methods
     */
    private async loadRegionConfigs(): Promise<void> {
        const configs = await this.getDefaultRegionConfigs();

        for (const config of configs) {
            this.regions.set(config.code, config);
        }
    }

    private async getDefaultRegionConfigs(): Promise<RegionConfig[]> {
        return [
            {
                code: 'US',
                name: 'United States',
                continent: 'North America',
                timezone: 'America/New_York',
                currency: 'USD',
                locale: 'en-US',
                dateFormat: 'MM/DD/YYYY',
                timeFormat: 'h:mm A',
                weekStart: 0, // Sunday
                businessDays: [1, 2, 3, 4, 5], // Monday to Friday
                businessHours: { start: '09:00', end: '17:00' },
                phoneFormat: '+1 (XXX) XXX-XXXX',
                addressFormat: {
                    fields: [
                        { name: 'street', label: 'Street Address', required: true, type: 'text' },
                        { name: 'city', label: 'City', required: true, type: 'text' },
                        { name: 'state', label: 'State', required: true, type: 'select', options: ['AL', 'AK', 'AZ'] },
                        { name: 'zipCode', label: 'ZIP Code', required: true, type: 'text' }
                    ],
                    format: '{street}\n{city}, {state} {zipCode}',
                    postalCodeRegex: '^\\d{5}(-\\d{4})?$'
                },
                taxSettings: {
                    enabled: true,
                    type: 'sales_tax',
                    rate: 8.5,
                    inclusive: false,
                    taxIdRequired: false,
                    exemptions: ['food', 'medicine']
                },
                paymentMethods: [
                    {
                        provider: 'stripe',
                        name: 'Credit Card',
                        enabled: true,
                        currencies: ['USD'],
                        fees: { percentage: 2.9, fixed: 0.30 },
                        limits: { min: 0.50, max: 999999 },
                        settings: {}
                    }
                ],
                compliance: {
                    gdpr: false,
                    ccpa: true,
                    pipeda: false,
                    lgpd: false,
                    dataRetention: { user: 2555, transaction: 2555, logs: 90 },
                    cookieConsent: true,
                    ageVerification: { required: true, minimumAge: 13 },
                    kycRequired: false,
                    amlRequired: true
                },
                cultural: {
                    rtl: false,
                    colorPreferences: {
                        primary: '#007bff',
                        secondary: '#6c757d',
                        success: '#28a745',
                        warning: '#ffc107',
                        danger: '#dc3545'
                    },
                    imagery: { style: 'western', restrictions: [] },
                    communication: {
                        formalityLevel: 'informal',
                        greetingStyle: 'Hi there!',
                        contactPreferences: ['email', 'phone', 'chat']
                    },
                    holidays: [
                        { name: 'New Year\'s Day', date: '01-01', type: 'national', recurring: true },
                        { name: 'Independence Day', date: '07-04', type: 'national', recurring: true },
                        { name: 'Christmas', date: '12-25', type: 'national', recurring: true }
                    ],
                    workingCalendar: {
                        weekends: [0, 6], // Sunday, Saturday
                        specialDays: []
                    }
                }
            },
            {
                code: 'NG',
                name: 'Nigeria',
                continent: 'Africa',
                timezone: 'Africa/Lagos',
                currency: 'NGN',
                locale: 'en-NG',
                dateFormat: 'DD/MM/YYYY',
                timeFormat: 'HH:mm',
                weekStart: 1, // Monday
                businessDays: [1, 2, 3, 4, 5],
                businessHours: { start: '08:00', end: '17:00' },
                phoneFormat: '+234 XXX XXX XXXX',
                addressFormat: {
                    fields: [
                        { name: 'street', label: 'Street Address', required: true, type: 'text' },
                        { name: 'city', label: 'City', required: true, type: 'text' },
                        { name: 'state', label: 'State', required: true, type: 'select', options: ['Lagos', 'Abuja', 'Kano'] },
                        { name: 'postalCode', label: 'Postal Code', required: false, type: 'text' }
                    ],
                    format: '{street}\n{city}, {state}\n{postalCode}',
                    postalCodeRegex: '^\\d{6}$'
                },
                taxSettings: {
                    enabled: true,
                    type: 'vat',
                    rate: 7.5,
                    inclusive: true,
                    taxIdRequired: true,
                    taxIdFormat: '^\\d{8}-\\d{4}$',
                    exemptions: ['basic_food', 'medicine', 'education']
                },
                paymentMethods: [
                    {
                        provider: 'paystack',
                        name: 'Paystack',
                        enabled: true,
                        currencies: ['NGN'],
                        fees: { percentage: 1.5 },
                        limits: { min: 100, max: 10000000 },
                        settings: {}
                    }
                ],
                compliance: {
                    gdpr: false,
                    ccpa: false,
                    pipeda: false,
                    lgpd: false,
                    dataRetention: { user: 1825, transaction: 2555, logs: 365 },
                    cookieConsent: false,
                    ageVerification: { required: true, minimumAge: 18 },
                    kycRequired: true,
                    amlRequired: true
                },
                cultural: {
                    rtl: false,
                    colorPreferences: {
                        primary: '#008751',
                        secondary: '#ffffff',
                        success: '#28a745',
                        warning: '#ffc107',
                        danger: '#dc3545'
                    },
                    imagery: { style: 'local', restrictions: ['alcohol', 'gambling'] },
                    communication: {
                        formalityLevel: 'formal',
                        greetingStyle: 'Good day!',
                        contactPreferences: ['phone', 'whatsapp', 'email']
                    },
                    holidays: [
                        { name: 'New Year\'s Day', date: '01-01', type: 'national', recurring: true },
                        { name: 'Independence Day', date: '10-01', type: 'national', recurring: true },
                        { name: 'Christmas Day', date: '12-25', type: 'national', recurring: true }
                    ],
                    workingCalendar: {
                        weekends: [0, 6],
                        specialDays: []
                    }
                }
            }
            // Add more regions as needed
        ];
    }
}

// Export singleton instance
export const regionConfig = RegionConfigManager.getInstance();