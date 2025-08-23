/**
 * Localized content delivery and cultural adaptation system
 * Handles content localization, cultural preferences, and regional adaptations
 */

import { tenantContext } from '../multi-tenancy/tenant-context';
import { regionConfig, RegionConfig } from './region-config';
import { i18n } from './i18n-manager';

export interface LocalizedContent {
    id: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document';
    category: string;
    locale: string;
    region?: string;
    content: ContentData;
    metadata: ContentMetadata;
    culturalAdaptations: CulturalAdaptation[];
    status: 'draft' | 'published' | 'archived';
    createdAt: Date;
    updatedAt: Date;
}

export interface ContentData {
    title?: string;
    description?: string;
    body?: string;
    url?: string;
    alt?: string;
    tags?: string[];
    properties?: Record<string, any>;
}

export interface ContentMetadata {
    author: string;
    version: string;
    approvedBy?: string;
    approvalDate?: Date;
    expiryDate?: Date;
    targetAudience: string[];
    contentRating?: string;
    keywords: string[];
}

export interface CulturalAdaptation {
    type: 'color' | 'imagery' | 'text' | 'layout' | 'functionality';
    region: string;
    adaptation: any;
    reason: string;
}

export interface ContentRequest {
    category: string;
    type?: string;
    locale?: string;
    region?: string;
    fallbackLocale?: string;
    culturalPreferences?: boolean;
}

export interface ContentTemplate {
    id: string;
    name: string;
    category: string;
    structure: TemplateField[];
    localizationRules: LocalizationRule[];
    culturalRules: CulturalRule[];
}

export interface TemplateField {
    name: string;
    type: 'text' | 'richtext' | 'image' | 'video' | 'select' | 'boolean';
    required: boolean;
    localizable: boolean;
    culturallyAdaptable: boolean;
    validation?: ValidationRule[];
}

export interface LocalizationRule {
    field: string;
    locale: string;
    transformation: 'translate' | 'format' | 'replace' | 'remove';
    parameters?: Record<string, any>;
}

export interface CulturalRule {
    field: string;
    region: string;
    condition: string;
    action: 'modify' | 'replace' | 'hide' | 'highlight';
    parameters?: Record<string, any>;
}

export interface ValidationRule {
    type: 'length' | 'pattern' | 'cultural' | 'compliance';
    parameters: Record<string, any>;
}

export class LocalizedContentManager {
    private static instance: LocalizedContentManager;
    private contentCache = new Map<string, LocalizedContent>();
    private templateCache = new Map<string, ContentTemplate>();
    private cacheTimeout = 10 * 60 * 1000; // 10 minutes

    static getInstance(): LocalizedContentManager {
        if (!LocalizedContentManager.instance) {
            LocalizedContentManager.instance = new LocalizedContentManager();
        }
        return LocalizedContentManager.instance;
    }

    /**
     * Get localized content
     */
    async getContent(request: ContentRequest): Promise<LocalizedContent | null> {
        const locale = request.locale || this.getCurrentLocale();
        const region = request.region || this.getCurrentRegion();

        const cacheKey = this.generateCacheKey(request, locale, region);
        let content = this.contentCache.get(cacheKey);

        if (!content) {
            content = await this.fetchContent(request, locale, region);
            if (content) {
                this.contentCache.set(cacheKey, content);
                setTimeout(() => this.contentCache.delete(cacheKey), this.cacheTimeout);
            }
        }

        if (!content && request.fallbackLocale && request.fallbackLocale !== locale) {
            // Try fallback locale
            const fallbackRequest = { ...request, locale: request.fallbackLocale };
            content = await this.getContent(fallbackRequest);
        }

        if (content && request.culturalPreferences !== false) {
            content = await this.applyCulturalAdaptations(content, region);
        }

        return content;
    }

    /**
     * Get multiple localized contents
     */
    async getContents(requests: ContentRequest[]): Promise<LocalizedContent[]> {
        const contents = await Promise.all(
            requests.map(request => this.getContent(request))
        );

        return contents.filter(content => content !== null) as LocalizedContent[];
    }

    /**
     * Create localized content
     */
    async createContent(
        baseContent: Partial<LocalizedContent>,
        locales: string[]
    ): Promise<LocalizedContent[]> {
        const contents: LocalizedContent[] = [];

        for (const locale of locales) {
            const localizedContent: LocalizedContent = {
                id: this.generateContentId(),
                type: baseContent.type || 'text',
                category: baseContent.category || 'general',
                locale,
                region: baseContent.region,
                content: await this.localizeContentData(baseContent.content || {}, locale),
                metadata: {
                    ...baseContent.metadata,
                    author: baseContent.metadata?.author || 'system',
                    version: '1.0.0',
                    keywords: baseContent.metadata?.keywords || []
                } as ContentMetadata,
                culturalAdaptations: [],
                status: 'draft',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Apply cultural adaptations
            const region = this.getRegionForLocale(locale);
            if (region) {
                localizedContent.culturalAdaptations = await this.generateCulturalAdaptations(
                    localizedContent,
                    region
                );
            }

            contents.push(localizedContent);
        }

        // Save contents to storage
        await this.saveContents(contents);

        return contents;
    }

    /**
     * Update localized content
     */
    async updateContent(
        contentId: string,
        updates: Partial<LocalizedContent>
    ): Promise<LocalizedContent | null> {
        const existing = await this.fetchContentById(contentId);
        if (!existing) return null;

        const updated: LocalizedContent = {
            ...existing,
            ...updates,
            updatedAt: new Date()
        };

        // Re-apply cultural adaptations if region changed
        if (updates.region && updates.region !== existing.region) {
            updated.culturalAdaptations = await this.generateCulturalAdaptations(
                updated,
                updates.region
            );
        }

        await this.saveContent(updated);

        // Clear cache
        this.clearContentCache(contentId);

        return updated;
    }

    /**
     * Get content template
     */
    async getTemplate(templateId: string): Promise<ContentTemplate | null> {
        let template = this.templateCache.get(templateId);

        if (!template) {
            template = await this.fetchTemplate(templateId);
            if (template) {
                this.templateCache.set(templateId, template);
            }
        }

        return template;
    }

    /**
     * Validate content against cultural and compliance rules
     */
    async validateContent(
        content: LocalizedContent,
        region?: string
    ): Promise<ValidationResult> {
        const targetRegion = region || content.region || this.getCurrentRegion();
        const regionConfig = await this.getRegionConfig(targetRegion);
        const validationErrors: ValidationError[] = [];

        // Check cultural restrictions
        if (regionConfig.cultural.imagery.restrictions.length > 0) {
            const imageRestrictions = regionConfig.cultural.imagery.restrictions;

            if (content.type === 'image' && content.content.tags) {
                const restrictedTags = content.content.tags.filter(tag =>
                    imageRestrictions.some(restriction => tag.toLowerCase().includes(restriction))
                );

                if (restrictedTags.length > 0) {
                    validationErrors.push({
                        field: 'content.tags',
                        type: 'cultural_restriction',
                        message: `Content contains restricted imagery: ${restrictedTags.join(', ')}`,
                        severity: 'error'
                    });
                }
            }
        }

        // Check compliance requirements
        if (regionConfig.compliance.ageVerification.required) {
            if (!content.metadata.contentRating) {
                validationErrors.push({
                    field: 'metadata.contentRating',
                    type: 'compliance',
                    message: 'Content rating is required for this region',
                    severity: 'warning'
                });
            }
        }

        // Check text content for cultural appropriateness
        if (content.content.body || content.content.description) {
            const textContent = [content.content.body, content.content.description]
                .filter(Boolean)
                .join(' ');

            const culturalIssues = await this.checkCulturalAppropriatenesss(textContent, targetRegion);
            validationErrors.push(...culturalIssues);
        }

        return {
            valid: validationErrors.filter(e => e.severity === 'error').length === 0,
            errors: validationErrors.filter(e => e.severity === 'error'),
            warnings: validationErrors.filter(e => e.severity === 'warning')
        };
    }

    /**
     * Get content analytics
     */
    async getContentAnalytics(
        contentId: string,
        dateRange?: { start: Date; end: Date }
    ): Promise<ContentAnalytics> {
        // This would integrate with analytics service
        return {
            contentId,
            views: 0,
            engagement: 0,
            conversions: 0,
            localeBreakdown: {},
            regionBreakdown: {},
            deviceBreakdown: {},
            timeRange: dateRange || { start: new Date(), end: new Date() }
        };
    }

    /**
     * Private methods
     */
    private getCurrentLocale(): string {
        const tenant = tenantContext.getCurrentTenant();
        return tenant?.locale || 'en-US';
    }

    private getCurrentRegion(): string {
        const tenant = tenantContext.getCurrentTenant();
        return tenant?.region || 'US';
    }

    private async getRegionConfig(region: string): Promise<RegionConfig> {
        return regionConfig.getRegionConfig(region);
    }

    private generateCacheKey(request: ContentRequest, locale: string, region: string): string {
        return `${request.category}_${request.type || 'any'}_${locale}_${region}`;
    }

    private generateContentId(): string {
        return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private async fetchContent(
        request: ContentRequest,
        locale: string,
        region: string
    ): Promise<LocalizedContent | null> {
        // This would fetch from database or CMS
        // For now, return null
        return null;
    }

    private async fetchContentById(contentId: string): Promise<LocalizedContent | null> {
        // This would fetch from database
        return null;
    }

    private async fetchTemplate(templateId: string): Promise<ContentTemplate | null> {
        // This would fetch from database
        return null;
    }

    private async localizeContentData(content: ContentData, locale: string): Promise<ContentData> {
        const localized = { ...content };

        if (content.title) {
            localized.title = await i18n.translate(content.title);
        }

        if (content.description) {
            localized.description = await i18n.translate(content.description);
        }

        if (content.body) {
            localized.body = await i18n.translate(content.body);
        }

        return localized;
    }

    private getRegionForLocale(locale: string): string | undefined {
        const localeRegionMap: Record<string, string> = {
            'en-US': 'US',
            'en-GB': 'GB',
            'en-NG': 'NG',
            'fr-FR': 'FR',
            'de-DE': 'DE',
            'es-ES': 'ES',
            'ar-SA': 'SA',
            'ar-AE': 'AE'
        };

        return localeRegionMap[locale];
    }

    private async generateCulturalAdaptations(
        content: LocalizedContent,
        region: string
    ): Promise<CulturalAdaptation[]> {
        const adaptations: CulturalAdaptation[] = [];
        const regionConf = await this.getRegionConfig(region);

        // Color adaptations
        if (regionConf.cultural.colorPreferences) {
            adaptations.push({
                type: 'color',
                region,
                adaptation: regionConf.cultural.colorPreferences,
                reason: 'Regional color preferences'
            });
        }

        // RTL layout adaptation
        if (regionConf.cultural.rtl) {
            adaptations.push({
                type: 'layout',
                region,
                adaptation: { direction: 'rtl' },
                reason: 'Right-to-left text direction'
            });
        }

        return adaptations;
    }

    private async applyCulturalAdaptations(
        content: LocalizedContent,
        region: string
    ): Promise<LocalizedContent> {
        const adapted = { ...content };

        for (const adaptation of content.culturalAdaptations) {
            if (adaptation.region === region) {
                switch (adaptation.type) {
                    case 'color':
                        adapted.content.properties = {
                            ...adapted.content.properties,
                            colors: adaptation.adaptation
                        };
                        break;
                    case 'layout':
                        adapted.content.properties = {
                            ...adapted.content.properties,
                            layout: adaptation.adaptation
                        };
                        break;
                    // Add more adaptation types as needed
                }
            }
        }

        return adapted;
    }

    private async checkCulturalAppropriatenesss(
        text: string,
        region: string
    ): Promise<ValidationError[]> {
        const errors: ValidationError[] = [];

        // This would integrate with content moderation services
        // For now, return empty array

        return errors;
    }

    private async saveContent(content: LocalizedContent): Promise<void> {
        // Save to database
    }

    private async saveContents(contents: LocalizedContent[]): Promise<void> {
        // Save multiple contents to database
    }

    private clearContentCache(contentId: string): void {
        // Clear all cache entries for this content
        for (const [key, content] of this.contentCache) {
            if (content.id === contentId) {
                this.contentCache.delete(key);
            }
        }
    }
}

// Supporting interfaces
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}

export interface ValidationError {
    field: string;
    type: string;
    message: string;
    severity: 'error' | 'warning';
}

export interface ContentAnalytics {
    contentId: string;
    views: number;
    engagement: number;
    conversions: number;
    localeBreakdown: Record<string, number>;
    regionBreakdown: Record<string, number>;
    deviceBreakdown: Record<string, number>;
    timeRange: { start: Date; end: Date };
}

// Export singleton instance
export const contentManager = LocalizedContentManager.getInstance();