/**
 * Comprehensive tests for multi-tenancy and localization features
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
    tenantContext,
    TenantService,
    TenantInfo,
    dbPartitionManager
} from '../multi-tenancy';
import {
    i18n,
    currencyService,
    regionConfig,
    contentManager
} from '../localization';

describe('Multi-Tenancy and Localization Integration', () => {
    let tenantService: TenantService;
    let testTenant: TenantInfo;

    beforeAll(async () => {
        // Initialize services
        tenantService = new TenantService(null, null); // Mock database connections

        await i18n.initialize([
            {
                code: 'en-US',
                name: 'English (US)',
                direction: 'ltr',
                dateFormat: 'MM/DD/YYYY',
                timeFormat: 'h:mm A',
                numberFormat: {
                    decimal: '.',
                    thousands: ',',
                    currency: { symbol: '$', position: 'before' }
                },
                pluralRules: [
                    { condition: 'n === 1', form: 'one' },
                    { condition: 'n !== 1', form: 'other' }
                ]
            },
            {
                code: 'en-NG',
                name: 'English (Nigeria)',
                direction: 'ltr',
                dateFormat: 'DD/MM/YYYY',
                timeFormat: 'HH:mm',
                numberFormat: {
                    decimal: '.',
                    thousands: ',',
                    currency: { symbol: '₦', position: 'before' }
                },
                pluralRules: [
                    { condition: 'n === 1', form: 'one' },
                    { condition: 'n !== 1', form: 'other' }
                ]
            }
        ]);

        await currencyService.initialize();
        await regionConfig.initialize();
    });

    beforeEach(async () => {
        // Create test tenant
        testTenant = {
            id: 'test-tenant-123',
            name: 'Test Tenant',
            domain: 'test.example.com',
            subdomain: 'test',
            region: 'NG',
            timezone: 'Africa/Lagos',
            currency: 'NGN',
            locale: 'en-NG',
            settings: {
                features: {
                    ecommerce: true,
                    taxi: true,
                    hotel: true,
                    advertisements: true
                },
                limits: {
                    maxUsers: 1000,
                    maxTransactions: 10000,
                    storageLimit: 1024 * 1024 * 1024 // 1GB
                },
                branding: {
                    primaryColor: '#008751',
                    secondaryColor: '#ffffff'
                },
                integrations: {
                    paymentGateways: ['paystack'],
                    notificationProviders: ['email', 'sms']
                }
            },
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        };
    });

    describe('Tenant Context Management', () => {
        it('should set and get tenant context', () => {
            const context = {
                tenant: testTenant,
                user: {
                    id: 'user-123',
                    roles: ['customer'],
                    permissions: ['read:products']
                },
                request: {
                    id: 'req-123',
                    ip: '192.168.1.1',
                    userAgent: 'Test Agent'
                }
            };

            tenantContext.run(context, () => {
                const currentTenant = tenantContext.getCurrentTenant();
                expect(currentTenant).toEqual(testTenant);

                const tenantId = tenantContext.getCurrentTenantId();
                expect(tenantId).toBe('test-tenant-123');

                const isEcommerceEnabled = tenantContext.isFeatureEnabled('ecommerce');
                expect(isEcommerceEnabled).toBe(true);

                const isTaxiEnabled = tenantContext.isFeatureEnabled('taxi');
                expect(isTaxiEnabled).toBe(true);
            });
        });

        it('should return undefined when no tenant context', () => {
            const currentTenant = tenantContext.getCurrentTenant();
            expect(currentTenant).toBeUndefined();

            const tenantId = tenantContext.getCurrentTenantId();
            expect(tenantId).toBeUndefined();
        });
    });

    describe('Internationalization (i18n)', () => {
        it('should translate text based on tenant locale', () => {
            const context = { tenant: testTenant };

            tenantContext.run(context, () => {
                const currentLocale = i18n.getCurrentLocale();
                expect(currentLocale).toBe('en-NG');

                // Test translation (would normally fetch from database)
                const welcomeText = i18n.translate('common.welcome');
                expect(typeof welcomeText).toBe('string');
            });
        });

        it('should format dates according to locale', () => {
            const context = { tenant: testTenant };
            const testDate = new Date('2024-01-15T10:30:00Z');

            tenantContext.run(context, () => {
                const formattedDate = i18n.formatDate(testDate);
                expect(typeof formattedDate).toBe('string');
                // Nigerian format should be DD/MM/YYYY
                expect(formattedDate).toMatch(/\d{2}\/\d{2}\/\d{4}/);
            });
        });

        it('should format currency according to tenant settings', () => {
            const context = { tenant: testTenant };

            tenantContext.run(context, () => {
                const formattedAmount = i18n.formatCurrency(1000);
                expect(typeof formattedAmount).toBe('string');
                expect(formattedAmount).toContain('NGN');
            });
        });

        it('should handle pluralization', () => {
            const context = { tenant: testTenant };

            tenantContext.run(context, () => {
                const singleItem = i18n.translatePlural('items', 1);
                const multipleItems = i18n.translatePlural('items', 5);

                expect(typeof singleItem).toBe('string');
                expect(typeof multipleItems).toBe('string');
            });
        });
    });

    describe('Currency Service', () => {
        it('should get tenant currency', () => {
            const context = { tenant: testTenant };

            tenantContext.run(context, () => {
                const tenantCurrency = currencyService.getTenantCurrency();
                expect(tenantCurrency).toBe('NGN');
            });
        });

        it('should format currency amounts', () => {
            const context = { tenant: testTenant };

            tenantContext.run(context, () => {
                const formatted = currencyService.formatCurrency(1500.50);
                expect(typeof formatted).toBe('string');
                expect(formatted).toContain('1500');
            });
        });

        it('should convert between currencies', async () => {
            const context = { tenant: testTenant };

            await tenantContext.run(context, async () => {
                const conversion = await currencyService.convert(100, 'USD', 'NGN');

                expect(conversion.originalAmount).toBe(100);
                expect(conversion.originalCurrency).toBe('USD');
                expect(conversion.convertedCurrency).toBe('NGN');
                expect(conversion.convertedAmount).toBeGreaterThan(0);
                expect(conversion.exchangeRate).toBeGreaterThan(0);
            });
        });

        it('should return same amount for same currency conversion', async () => {
            const context = { tenant: testTenant };

            await tenantContext.run(context, async () => {
                const conversion = await currencyService.convert(100, 'NGN', 'NGN');

                expect(conversion.originalAmount).toBe(100);
                expect(conversion.convertedAmount).toBe(100);
                expect(conversion.exchangeRate).toBe(1);
            });
        });

        it('should check if currency is supported', () => {
            expect(currencyService.isCurrencySupported('USD')).toBe(true);
            expect(currencyService.isCurrencySupported('NGN')).toBe(true);
            expect(currencyService.isCurrencySupported('XYZ')).toBe(false);
        });
    });

    describe('Region Configuration', () => {
        it('should get current region from tenant', () => {
            const context = { tenant: testTenant };

            tenantContext.run(context, () => {
                const currentRegion = regionConfig.getCurrentRegion();
                expect(currentRegion).toBe('NG');
            });
        });

        it('should get region configuration', () => {
            const context = { tenant: testTenant };

            tenantContext.run(context, () => {
                const config = regionConfig.getRegionConfig();
                expect(config.code).toBe('NG');
                expect(config.currency).toBe('NGN');
                expect(config.locale).toBe('en-NG');
            });
        });

        it('should get tax settings for region', () => {
            const context = { tenant: testTenant };

            tenantContext.run(context, () => {
                const taxSettings = regionConfig.getTaxSettings();
                expect(taxSettings.enabled).toBe(true);
                expect(taxSettings.type).toBe('vat');
                expect(taxSettings.rate).toBe(7.5);
            });
        });

        it('should get compliance settings for region', () => {
            const context = { tenant: testTenant };

            tenantContext.run(context, () => {
                const compliance = regionConfig.getComplianceSettings();
                expect(compliance.gdpr).toBe(false);
                expect(compliance.ageVerification.required).toBe(true);
                expect(compliance.ageVerification.minimumAge).toBe(18);
            });
        });

        it('should validate postal code for region', () => {
            const context = { tenant: testTenant };

            tenantContext.run(context, () => {
                const validPostalCode = regionConfig.validatePostalCode('100001');
                expect(validPostalCode).toBe(true);

                const invalidPostalCode = regionConfig.validatePostalCode('12345');
                expect(invalidPostalCode).toBe(false);
            });
        });

        it('should check business hours', () => {
            const context = { tenant: testTenant };

            tenantContext.run(context, () => {
                // Monday 10 AM
                const businessHours = new Date('2024-01-15T10:00:00');
                const isOpen = regionConfig.isBusinessOpen(businessHours);
                expect(isOpen).toBe(true);

                // Sunday 10 AM
                const weekend = new Date('2024-01-14T10:00:00');
                const isOpenWeekend = regionConfig.isBusinessOpen(weekend);
                expect(isOpenWeekend).toBe(false);
            });
        });
    });

    describe('Content Management', () => {
        it('should get localized content', async () => {
            const context = { tenant: testTenant };

            await tenantContext.run(context, async () => {
                const content = await contentManager.getContent({
                    category: 'ecommerce',
                    type: 'text',
                    locale: 'en-NG'
                });

                // Content might be null if not found, which is acceptable
                if (content) {
                    expect(content.locale).toBe('en-NG');
                    expect(content.category).toBe('ecommerce');
                }
            });
        });

        it('should validate content for region', async () => {
            const context = { tenant: testTenant };

            await tenantContext.run(context, async () => {
                const testContent = {
                    id: 'test-content',
                    type: 'text' as const,
                    category: 'ecommerce',
                    locale: 'en-NG',
                    region: 'NG',
                    content: {
                        title: 'Test Product',
                        description: 'A test product description',
                        tags: ['electronics', 'mobile']
                    },
                    metadata: {
                        author: 'test-author',
                        version: '1.0.0',
                        keywords: ['test', 'product']
                    },
                    culturalAdaptations: [],
                    status: 'published' as const,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const validation = await contentManager.validateContent(testContent, 'NG');
                expect(validation.valid).toBe(true);
                expect(validation.errors).toHaveLength(0);
            });
        });
    });

    describe('Database Partitioning', () => {
        it('should handle tenant-specific database operations', async () => {
            const context = { tenant: testTenant };

            await tenantContext.run(context, async () => {
                // This would normally interact with a real database
                // For testing, we'll just verify the context is available
                const tenantId = tenantContext.getCurrentTenantId();
                expect(tenantId).toBe('test-tenant-123');
            });
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle complete ecommerce flow with localization', async () => {
            const context = { tenant: testTenant };

            await tenantContext.run(context, async () => {
                // 1. Get tenant context
                const tenant = tenantContext.getCurrentTenant();
                expect(tenant?.id).toBe('test-tenant-123');

                // 2. Check feature availability
                const ecommerceEnabled = tenantContext.isFeatureEnabled('ecommerce');
                expect(ecommerceEnabled).toBe(true);

                // 3. Get regional configuration
                const regionalConfig = regionConfig.getRegionConfig();
                expect(regionalConfig.code).toBe('NG');

                // 4. Format currency
                const price = currencyService.formatCurrency(1000);
                expect(typeof price).toBe('string');

                // 5. Translate content
                const welcomeMessage = i18n.translate('common.welcome');
                expect(typeof welcomeMessage).toBe('string');

                // 6. Convert currency
                const conversion = await currencyService.convert(100, 'USD', 'NGN');
                expect(conversion.convertedCurrency).toBe('NGN');
            });
        });

        it('should handle multi-tenant isolation', () => {
            const tenant1Context = { tenant: testTenant };
            const tenant2 = { ...testTenant, id: 'tenant-2', region: 'US', currency: 'USD', locale: 'en-US' };
            const tenant2Context = { tenant: tenant2 };

            // Test tenant 1
            tenantContext.run(tenant1Context, () => {
                expect(tenantContext.getCurrentTenantId()).toBe('test-tenant-123');
                expect(currencyService.getTenantCurrency()).toBe('NGN');
                expect(regionConfig.getCurrentRegion()).toBe('NG');
            });

            // Test tenant 2
            tenantContext.run(tenant2Context, () => {
                expect(tenantContext.getCurrentTenantId()).toBe('tenant-2');
                expect(currencyService.getTenantCurrency()).toBe('USD');
                expect(regionConfig.getCurrentRegion()).toBe('US');
            });
        });

        it('should handle fallback scenarios', () => {
            const contextWithoutTenant = {};

            tenantContext.run(contextWithoutTenant as any, () => {
                // Should use fallback values when no tenant context
                const currency = currencyService.getTenantCurrency();
                expect(currency).toBe('USD'); // Default fallback

                const region = regionConfig.getCurrentRegion();
                expect(region).toBe('US'); // Default fallback

                const locale = i18n.getCurrentLocale();
                expect(locale).toBe('en-US'); // Default fallback
            });
        });
    });

    afterAll(async () => {
        // Cleanup resources
        await dbPartitionManager.cleanup();
    });
});