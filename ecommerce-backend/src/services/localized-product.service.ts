/**
 * Localized product service
 * Demonstrates how to integrate multi-tenancy and localization in business logic
 */

import { dbPartitionManager, tenantContext } from '@common/multi-tenancy';
import { currencyService, i18n, regionConfig, contentManager } from '@common/localization';

export interface LocalizedProduct {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    originalPrice?: number;
    originalCurrency?: string;
    category: string;
    images: string[];
    specifications: Record<string, any>;
    availability: ProductAvailability;
    localizedContent: LocalizedProductContent;
    regionalCompliance: RegionalCompliance;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductAvailability {
    inStock: boolean;
    quantity: number;
    estimatedDelivery: string;
    shippingOptions: ShippingOption[];
}

export interface ShippingOption {
    method: string;
    cost: number;
    currency: string;
    estimatedDays: number;
    available: boolean;
}

export interface LocalizedProductContent {
    name: Record<string, string>; // locale -> translated name
    description: Record<string, string>; // locale -> translated description
    specifications: Record<string, Record<string, string>>; // locale -> spec translations
    images: Record<string, string[]>; // region -> region-specific images
    culturalAdaptations: Record<string, any>; // region -> adaptations
}

export interface RegionalCompliance {
    restricted: boolean;
    restrictedRegions: string[];
    ageRestriction?: number;
    certifications: string[];
    warnings: string[];
}

export class LocalizedProductService {
    /**
     * Get product with localization and currency conversion
     */
    async getProduct(productId: string): Promise<LocalizedProduct | null> {
        try {
            const tenant = tenantContext.getCurrentTenant();
            if (!tenant) {
                throw new Error('No tenant context available');
            }

            // Get product from tenant-specific database
            const product = await this.fetchProductFromDatabase(productId);
            if (!product) return null;

            // Apply localization
            const localizedProduct = await this.localizeProduct(product, tenant.locale, tenant.region);

            // Convert currency if needed
            if (product.currency !== tenant.currency) {
                const conversion = await currencyService.convert(
                    product.price,
                    product.currency,
                    tenant.currency
                );

                localizedProduct.originalPrice = product.price;
                localizedProduct.originalCurrency = product.currency;
                localizedProduct.price = conversion.convertedAmount;
                localizedProduct.currency = conversion.convertedCurrency;
            }

            // Apply regional compliance rules
            localizedProduct.regionalCompliance = await this.checkRegionalCompliance(
                product,
                tenant.region
            );

            return localizedProduct;
        } catch (error) {
            console.error('Error getting localized product:', error);
            throw error;
        }
    }

    /**
     * Search products with localization
     */
    async searchProducts(
        query: string,
        filters: ProductFilters = {},
        pagination: { page: number; limit: number } = { page: 1, limit: 20 }
    ): Promise<{ products: LocalizedProduct[]; total: number; hasMore: boolean }> {
        try {
            const tenant = tenantContext.getCurrentTenant();
            if (!tenant) {
                throw new Error('No tenant context available');
            }

            // Translate search query if needed
            const localizedQuery = await this.localizeSearchQuery(query, tenant.locale);

            // Apply regional filters
            const regionalFilters = await this.applyRegionalFilters(filters, tenant.region);

            // Search in tenant database
            const searchResults = await this.searchInDatabase(
                localizedQuery,
                regionalFilters,
                pagination
            );

            // Localize all products
            const localizedProducts = await Promise.all(
                searchResults.products.map(product =>
                    this.localizeProduct(product, tenant.locale, tenant.region)
                )
            );

            // Convert currencies
            const convertedProducts = await Promise.all(
                localizedProducts.map(product => this.convertProductCurrency(product, tenant.currency))
            );

            return {
                products: convertedProducts,
                total: searchResults.total,
                hasMore: searchResults.hasMore
            };
        } catch (error) {
            console.error('Error searching localized products:', error);
            throw error;
        }
    }

    /**
     * Create product with multi-locale support
     */
    async createProduct(productData: CreateProductRequest): Promise<LocalizedProduct> {
        try {
            const tenant = tenantContext.getCurrentTenant();
            if (!tenant) {
                throw new Error('No tenant context available');
            }

            // Validate regional compliance
            const complianceCheck = await this.validateProductCompliance(productData, tenant.region);
            if (!complianceCheck.valid) {
                throw new Error(`Product compliance validation failed: ${complianceCheck.errors.join(', ')}`);
            }

            // Create base product
            const product = await this.createProductInDatabase(productData);

            // Generate localized content for all tenant locales
            const supportedLocales = await this.getTenantSupportedLocales(tenant.id);
            const localizedContent = await this.generateLocalizedContent(productData, supportedLocales);

            // Save localized content
            await this.saveLocalizedContent(product.id, localizedContent);

            // Return localized product
            return this.localizeProduct(product, tenant.locale, tenant.region);
        } catch (error) {
            console.error('Error creating localized product:', error);
            throw error;
        }
    }

    /**
     * Update product with localization
     */
    async updateProduct(
        productId: string,
        updates: UpdateProductRequest
    ): Promise<LocalizedProduct | null> {
        try {
            const tenant = tenantContext.getCurrentTenant();
            if (!tenant) {
                throw new Error('No tenant context available');
            }

            // Get existing product
            const existingProduct = await this.fetchProductFromDatabase(productId);
            if (!existingProduct) return null;

            // Validate regional compliance for updates
            if (updates.specifications || updates.category) {
                const complianceCheck = await this.validateProductCompliance(
                    { ...existingProduct, ...updates },
                    tenant.region
                );
                if (!complianceCheck.valid) {
                    throw new Error(`Product update compliance validation failed: ${complianceCheck.errors.join(', ')}`);
                }
            }

            // Update product in database
            const updatedProduct = await this.updateProductInDatabase(productId, updates);

            // Update localized content if text fields changed
            if (updates.name || updates.description || updates.specifications) {
                const supportedLocales = await this.getTenantSupportedLocales(tenant.id);
                const updatedLocalizedContent = await this.updateLocalizedContent(
                    productId,
                    updates,
                    supportedLocales
                );
                await this.saveLocalizedContent(productId, updatedLocalizedContent);
            }

            return this.localizeProduct(updatedProduct, tenant.locale, tenant.region);
        } catch (error) {
            console.error('Error updating localized product:', error);
            throw error;
        }
    }

    /**
     * Private helper methods
     */
    private async fetchProductFromDatabase(productId: string): Promise<any> {
        const query = `
      SELECT * FROM products 
      WHERE id = $1 AND status = 'active'
    `;

        const result = await dbPartitionManager.query(query, [productId]);
        return result.rows[0] || null;
    }

    private async localizeProduct(
        product: any,
        locale: string,
        region: string
    ): Promise<LocalizedProduct> {
        // Get localized content
        const localizedContent = await contentManager.getContent({
            category: 'product',
            type: 'text',
            locale,
            region
        });

        // Translate product fields
        const translatedName = await i18n.translate({
            key: `product.${product.id}.name`,
            defaultValue: product.name
        });

        const translatedDescription = await i18n.translate({
            key: `product.${product.id}.description`,
            defaultValue: product.description
        });

        // Get regional configuration
        const regionalConfig = regionConfig.getRegionConfig(region);

        return {
            id: product.id,
            name: translatedName,
            description: translatedDescription,
            price: product.price,
            currency: product.currency,
            category: product.category,
            images: product.images || [],
            specifications: product.specifications || {},
            availability: await this.getProductAvailability(product.id, region),
            localizedContent: {
                name: { [locale]: translatedName },
                description: { [locale]: translatedDescription },
                specifications: {},
                images: {},
                culturalAdaptations: {}
            },
            regionalCompliance: await this.checkRegionalCompliance(product, region),
            createdAt: product.created_at,
            updatedAt: product.updated_at
        };
    }

    private async convertProductCurrency(
        product: LocalizedProduct,
        targetCurrency: string
    ): Promise<LocalizedProduct> {
        if (product.currency === targetCurrency) {
            return product;
        }

        const conversion = await currencyService.convert(
            product.price,
            product.currency,
            targetCurrency
        );

        return {
            ...product,
            originalPrice: product.price,
            originalCurrency: product.currency,
            price: conversion.convertedAmount,
            currency: conversion.convertedCurrency
        };
    }

    private async checkRegionalCompliance(
        product: any,
        region: string
    ): Promise<RegionalCompliance> {
        const regionalConfig = regionConfig.getRegionConfig(region);

        // Check if product is restricted in this region
        const restricted = this.isProductRestricted(product, regionalConfig);

        return {
            restricted,
            restrictedRegions: restricted ? [region] : [],
            ageRestriction: this.getAgeRestriction(product, regionalConfig),
            certifications: this.getRequiredCertifications(product, regionalConfig),
            warnings: this.getComplianceWarnings(product, regionalConfig)
        };
    }

    private isProductRestricted(product: any, regionalConfig: any): boolean {
        // Example: Check if product category is restricted
        const restrictedCategories = regionalConfig.cultural?.imagery?.restrictions || [];
        return restrictedCategories.some((restriction: string) =>
            product.category.toLowerCase().includes(restriction.toLowerCase())
        );
    }

    private getAgeRestriction(product: any, regionalConfig: any): number | undefined {
        if (regionalConfig.compliance?.ageVerification?.required) {
            return regionalConfig.compliance.ageVerification.minimumAge;
        }
        return undefined;
    }

    private getRequiredCertifications(product: any, regionalConfig: any): string[] {
        // Return required certifications based on product and region
        return [];
    }

    private getComplianceWarnings(product: any, regionalConfig: any): string[] {
        const warnings: string[] = [];

        if (regionalConfig.taxSettings?.taxIdRequired && product.category === 'business') {
            warnings.push('Tax ID required for business category products');
        }

        return warnings;
    }

    private async getProductAvailability(
        productId: string,
        region: string
    ): Promise<ProductAvailability> {
        // Get availability from inventory service
        // This is a simplified implementation
        return {
            inStock: true,
            quantity: 100,
            estimatedDelivery: '2-3 business days',
            shippingOptions: [
                {
                    method: 'Standard',
                    cost: 5.99,
                    currency: 'USD',
                    estimatedDays: 3,
                    available: true
                }
            ]
        };
    }

    private async localizeSearchQuery(query: string, locale: string): Promise<string> {
        // Translate search terms if needed
        return query; // Simplified implementation
    }

    private async applyRegionalFilters(
        filters: ProductFilters,
        region: string
    ): Promise<ProductFilters> {
        const regionalConfig = regionConfig.getRegionConfig(region);

        // Apply regional restrictions to filters
        const restrictedCategories = regionalConfig.cultural?.imagery?.restrictions || [];

        if (restrictedCategories.length > 0) {
            filters.excludeCategories = [
                ...(filters.excludeCategories || []),
                ...restrictedCategories
            ];
        }

        return filters;
    }

    private async searchInDatabase(
        query: string,
        filters: ProductFilters,
        pagination: { page: number; limit: number }
    ): Promise<{ products: any[]; total: number; hasMore: boolean }> {
        // Implement database search with filters and pagination
        // This is a simplified implementation
        return {
            products: [],
            total: 0,
            hasMore: false
        };
    }

    private async createProductInDatabase(productData: CreateProductRequest): Promise<any> {
        // Create product in tenant database
        const query = `
      INSERT INTO products (name, description, price, currency, category, specifications)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

        const result = await dbPartitionManager.query(query, [
            productData.name,
            productData.description,
            productData.price,
            productData.currency,
            productData.category,
            JSON.stringify(productData.specifications || {})
        ]);

        return result.rows[0];
    }

    private async updateProductInDatabase(
        productId: string,
        updates: UpdateProductRequest
    ): Promise<any> {
        // Update product in tenant database
        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');

        const query = `
      UPDATE products 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

        const values = [productId, ...Object.values(updates)];
        const result = await dbPartitionManager.query(query, values);

        return result.rows[0];
    }

    private async validateProductCompliance(
        productData: any,
        region: string
    ): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];
        const regionalConfig = regionConfig.getRegionConfig(region);

        // Add validation logic based on regional compliance

        return {
            valid: errors.length === 0,
            errors
        };
    }

    private async getTenantSupportedLocales(tenantId: string): Promise<string[]> {
        // Get supported locales for tenant
        return ['en-US', 'en-NG']; // Simplified implementation
    }

    private async generateLocalizedContent(
        productData: CreateProductRequest,
        locales: string[]
    ): Promise<LocalizedProductContent> {
        // Generate localized content for all supported locales
        const content: LocalizedProductContent = {
            name: {},
            description: {},
            specifications: {},
            images: {},
            culturalAdaptations: {}
        };

        for (const locale of locales) {
            content.name[locale] = productData.name;
            content.description[locale] = productData.description;
        }

        return content;
    }

    private async updateLocalizedContent(
        productId: string,
        updates: UpdateProductRequest,
        locales: string[]
    ): Promise<LocalizedProductContent> {
        // Update localized content
        return this.generateLocalizedContent(updates as CreateProductRequest, locales);
    }

    private async saveLocalizedContent(
        productId: string,
        content: LocalizedProductContent
    ): Promise<void> {
        // Save localized content to database or content management system
    }
}

// Supporting interfaces
export interface ProductFilters {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    excludeCategories?: string[];
}

export interface CreateProductRequest {
    name: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    specifications?: Record<string, any>;
    images?: string[];
}

export interface UpdateProductRequest {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    category?: string;
    specifications?: Record<string, any>;
    images?: string[];
}