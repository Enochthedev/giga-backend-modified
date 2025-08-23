import { AdminDatabase } from '../database/connection';
import { AuditService } from './audit.service';
import { PlatformConfiguration } from '../types/admin.types';
import { logger } from '../utils/logger';

/**
 * Configuration management service for platform settings
 */
export class ConfigurationService {
    /**
     * Get configuration value by category and key
     */
    public static async getConfiguration(
        category: string,
        key: string
    ): Promise<PlatformConfiguration | null> {
        try {
            const result = await AdminDatabase.query(
                'SELECT * FROM platform_configurations WHERE category = $1 AND key = $2',
                [category, key]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapConfigurationFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Get configuration error:', error);
            throw error;
        }
    }

    /**
     * Get all configurations by category
     */
    public static async getConfigurationsByCategory(
        category: string
    ): Promise<PlatformConfiguration[]> {
        try {
            const result = await AdminDatabase.query(
                'SELECT * FROM platform_configurations WHERE category = $1 ORDER BY key',
                [category]
            );

            return result.rows.map(row => this.mapConfigurationFromDb(row));
        } catch (error) {
            logger.error('Get configurations by category error:', error);
            throw error;
        }
    }

    /**
     * Get all configuration categories
     */
    public static async getConfigurationCategories(): Promise<string[]> {
        try {
            const result = await AdminDatabase.query(
                'SELECT DISTINCT category FROM platform_configurations ORDER BY category'
            );

            return result.rows.map(row => row.category);
        } catch (error) {
            logger.error('Get configuration categories error:', error);
            throw error;
        }
    }

    /**
     * Set configuration value
     */
    public static async setConfiguration(
        category: string,
        key: string,
        value: any,
        description?: string,
        isSensitive: boolean = false,
        validationSchema?: Record<string, any>,
        updatedBy?: string
    ): Promise<PlatformConfiguration> {
        try {
            // Get existing configuration for audit log
            const existingConfig = await this.getConfiguration(category, key);

            // Validate value if schema is provided
            if (validationSchema) {
                this.validateConfigurationValue(value, validationSchema);
            }

            const result = await AdminDatabase.query(`
                INSERT INTO platform_configurations (
                    category, key, value, description, is_sensitive, validation_schema, updated_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (category, key) 
                DO UPDATE SET 
                    value = EXCLUDED.value,
                    description = EXCLUDED.description,
                    is_sensitive = EXCLUDED.is_sensitive,
                    validation_schema = EXCLUDED.validation_schema,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [
                category,
                key,
                JSON.stringify(value),
                description || null,
                isSensitive,
                validationSchema ? JSON.stringify(validationSchema) : null,
                updatedBy || null
            ]);

            const newConfig = this.mapConfigurationFromDb(result.rows[0]);

            // Log configuration change
            await AuditService.logAction({
                adminId: updatedBy,
                action: existingConfig ? 'configuration_updated' : 'configuration_created',
                resourceType: 'platform_configuration',
                resourceId: `${category}.${key}`,
                oldValues: existingConfig ? {
                    value: existingConfig.value,
                    description: existingConfig.description,
                    isSensitive: existingConfig.isSensitive
                } : undefined,
                newValues: {
                    value: isSensitive ? '[REDACTED]' : value,
                    description,
                    isSensitive
                },
                metadata: {
                    category,
                    key
                }
            });

            return newConfig;
        } catch (error) {
            logger.error('Set configuration error:', error);
            throw error;
        }
    }

    /**
     * Delete configuration
     */
    public static async deleteConfiguration(
        category: string,
        key: string,
        deletedBy?: string
    ): Promise<boolean> {
        try {
            // Get existing configuration for audit log
            const existingConfig = await this.getConfiguration(category, key);

            if (!existingConfig) {
                return false;
            }

            const result = await AdminDatabase.query(
                'DELETE FROM platform_configurations WHERE category = $1 AND key = $2',
                [category, key]
            );

            const deleted = (result.rowCount || 0) > 0;

            if (deleted) {
                // Log configuration deletion
                await AuditService.logAction({
                    adminId: deletedBy,
                    action: 'configuration_deleted',
                    resourceType: 'platform_configuration',
                    resourceId: `${category}.${key}`,
                    oldValues: {
                        value: existingConfig.isSensitive ? '[REDACTED]' : existingConfig.value,
                        description: existingConfig.description,
                        isSensitive: existingConfig.isSensitive
                    },
                    metadata: {
                        category,
                        key
                    }
                });
            }

            return deleted;
        } catch (error) {
            logger.error('Delete configuration error:', error);
            throw error;
        }
    }

    /**
     * Get configuration value with type casting
     */
    public static async getConfigurationValue<T = any>(
        category: string,
        key: string,
        defaultValue?: T
    ): Promise<T> {
        try {
            const config = await this.getConfiguration(category, key);

            if (!config) {
                if (defaultValue !== undefined) {
                    return defaultValue;
                }
                throw new Error(`Configuration not found: ${category}.${key}`);
            }

            return config.value as T;
        } catch (error) {
            logger.error('Get configuration value error:', error);
            throw error;
        }
    }

    /**
     * Bulk update configurations
     */
    public static async bulkUpdateConfigurations(
        configurations: Array<{
            category: string;
            key: string;
            value: any;
            description?: string;
            isSensitive?: boolean;
        }>,
        updatedBy?: string
    ): Promise<PlatformConfiguration[]> {
        try {
            const results: PlatformConfiguration[] = [];

            await AdminDatabase.transaction(async (client) => {
                for (const config of configurations) {
                    // Get existing configuration for audit log
                    const existingConfig = await this.getConfiguration(config.category, config.key);

                    const result = await client.query(`
                        INSERT INTO platform_configurations (
                            category, key, value, description, is_sensitive, updated_by
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (category, key) 
                        DO UPDATE SET 
                            value = EXCLUDED.value,
                            description = EXCLUDED.description,
                            is_sensitive = EXCLUDED.is_sensitive,
                            updated_by = EXCLUDED.updated_by,
                            updated_at = CURRENT_TIMESTAMP
                        RETURNING *
                    `, [
                        config.category,
                        config.key,
                        JSON.stringify(config.value),
                        config.description || null,
                        config.isSensitive || false,
                        updatedBy || null
                    ]);

                    const newConfig = this.mapConfigurationFromDb(result.rows[0]);
                    results.push(newConfig);

                    // Log configuration change
                    await AuditService.logAction({
                        adminId: updatedBy,
                        action: existingConfig ? 'configuration_updated' : 'configuration_created',
                        resourceType: 'platform_configuration',
                        resourceId: `${config.category}.${config.key}`,
                        oldValues: existingConfig ? {
                            value: existingConfig.value,
                            description: existingConfig.description,
                            isSensitive: existingConfig.isSensitive
                        } : undefined,
                        newValues: {
                            value: config.isSensitive ? '[REDACTED]' : config.value,
                            description: config.description,
                            isSensitive: config.isSensitive
                        },
                        metadata: {
                            category: config.category,
                            key: config.key,
                            bulkUpdate: true
                        }
                    });
                }
            });

            return results;
        } catch (error) {
            logger.error('Bulk update configurations error:', error);
            throw error;
        }
    }

    /**
     * Export configurations to JSON
     */
    public static async exportConfigurations(
        category?: string,
        includeSensitive: boolean = false
    ): Promise<Record<string, Record<string, any>>> {
        try {
            let query = 'SELECT * FROM platform_configurations';
            const params: any[] = [];

            if (category) {
                query += ' WHERE category = $1';
                params.push(category);
            }

            if (!includeSensitive) {
                query += category ? ' AND is_sensitive = false' : ' WHERE is_sensitive = false';
            }

            query += ' ORDER BY category, key';

            const result = await AdminDatabase.query(query, params);
            const configurations: Record<string, Record<string, any>> = {};

            for (const row of result.rows) {
                const config = this.mapConfigurationFromDb(row);

                if (!configurations[config.category]) {
                    configurations[config.category] = {};
                }

                configurations[config.category][config.key] = {
                    value: config.isSensitive && !includeSensitive ? '[REDACTED]' : config.value,
                    description: config.description,
                    isSensitive: config.isSensitive
                };
            }

            return configurations;
        } catch (error) {
            logger.error('Export configurations error:', error);
            throw error;
        }
    }

    /**
     * Import configurations from JSON
     */
    public static async importConfigurations(
        configurations: Record<string, Record<string, any>>,
        updatedBy?: string,
        overwriteExisting: boolean = false
    ): Promise<{ imported: number; skipped: number; errors: string[] }> {
        try {
            let imported = 0;
            let skipped = 0;
            const errors: string[] = [];

            await AdminDatabase.transaction(async () => {
                for (const [category, categoryConfigs] of Object.entries(configurations)) {
                    for (const [key, configData] of Object.entries(categoryConfigs)) {
                        try {
                            // Check if configuration exists
                            const existingConfig = await this.getConfiguration(category, key);

                            if (existingConfig && !overwriteExisting) {
                                skipped++;
                                continue;
                            }

                            await this.setConfiguration(
                                category,
                                key,
                                configData.value,
                                configData.description,
                                configData.isSensitive || false,
                                undefined,
                                updatedBy
                            );

                            imported++;
                        } catch (error) {
                            const errorMsg = `Failed to import ${category}.${key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                            errors.push(errorMsg);
                            logger.error(errorMsg);
                        }
                    }
                }
            });

            // Log import operation
            await AuditService.logAction({
                adminId: updatedBy,
                action: 'configurations_imported',
                resourceType: 'platform_configuration',
                success: errors.length === 0,
                metadata: {
                    imported,
                    skipped,
                    errorCount: errors.length,
                    overwriteExisting
                }
            });

            return { imported, skipped, errors };
        } catch (error) {
            logger.error('Import configurations error:', error);
            throw error;
        }
    }

    /**
     * Validate configuration value against schema
     */
    private static validateConfigurationValue(
        value: any,
        schema: Record<string, any>
    ): void {
        // Basic validation - can be extended with more sophisticated validation
        if (schema.type) {
            const actualType = typeof value;
            if (actualType !== schema.type) {
                throw new Error(`Expected type ${schema.type}, got ${actualType}`);
            }
        }

        if (schema.required && (value === null || value === undefined)) {
            throw new Error('Value is required');
        }

        if (schema.enum && !schema.enum.includes(value)) {
            throw new Error(`Value must be one of: ${schema.enum.join(', ')}`);
        }

        if (schema.min !== undefined && value < schema.min) {
            throw new Error(`Value must be at least ${schema.min}`);
        }

        if (schema.max !== undefined && value > schema.max) {
            throw new Error(`Value must be at most ${schema.max}`);
        }

        if (schema.pattern && typeof value === 'string') {
            const regex = new RegExp(schema.pattern);
            if (!regex.test(value)) {
                throw new Error(`Value does not match pattern: ${schema.pattern}`);
            }
        }
    }

    /**
     * Map database row to PlatformConfiguration object
     */
    private static mapConfigurationFromDb(row: any): PlatformConfiguration {
        return {
            id: row.id,
            category: row.category,
            key: row.key,
            value: row.value ? JSON.parse(row.value) : null,
            description: row.description,
            isSensitive: row.is_sensitive,
            validationSchema: row.validation_schema ? JSON.parse(row.validation_schema) : undefined,
            updatedBy: row.updated_by,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}