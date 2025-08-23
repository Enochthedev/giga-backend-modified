import { Response } from 'express';
import { ConfigurationService } from '../services/configuration.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

/**
 * Configuration controller for platform settings management
 */
export class ConfigurationController {
    /**
     * Get configuration by category and key
     */
    public static async getConfiguration(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { category, key } = req.params;
            const config = await ConfigurationService.getConfiguration(category, key);

            if (!config) {
                res.status(404).json({
                    success: false,
                    message: 'Configuration not found'
                });
                return;
            }

            res.json({
                success: true,
                data: config
            });
        } catch (error: any) {
            logger.error('Get configuration error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get configuration'
            });
        }
    }

    /**
     * Get all configurations by category
     */
    public static async getConfigurationsByCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { category } = req.params;
            const configs = await ConfigurationService.getConfigurationsByCategory(category);

            res.json({
                success: true,
                data: configs
            });
        } catch (error: any) {
            logger.error('Get configurations by category error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get configurations'
            });
        }
    }

    /**
     * Get all configuration categories
     */
    public static async getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const categories = await ConfigurationService.getConfigurationCategories();

            res.json({
                success: true,
                data: categories
            });
        } catch (error: any) {
            logger.error('Get configuration categories error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get categories'
            });
        }
    }

    /**
     * Set configuration value
     */
    public static async setConfiguration(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { category, key } = req.params;
            const { value, description, isSensitive, validationSchema } = req.body;
            const updatedBy = req.admin!.id;

            // Validate required fields
            if (value === undefined) {
                res.status(400).json({
                    success: false,
                    message: 'Value is required'
                });
                return;
            }

            const config = await ConfigurationService.setConfiguration(
                category,
                key,
                value,
                description,
                isSensitive || false,
                validationSchema,
                updatedBy
            );

            res.json({
                success: true,
                message: 'Configuration set successfully',
                data: config
            });
        } catch (error: any) {
            logger.error('Set configuration error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to set configuration'
            });
        }
    }

    /**
     * Delete configuration
     */
    public static async deleteConfiguration(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { category, key } = req.params;
            const deletedBy = req.admin!.id;

            const deleted = await ConfigurationService.deleteConfiguration(category, key, deletedBy);

            if (!deleted) {
                res.status(404).json({
                    success: false,
                    message: 'Configuration not found'
                });
                return;
            }

            res.json({
                success: true,
                message: 'Configuration deleted successfully'
            });
        } catch (error: any) {
            logger.error('Delete configuration error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to delete configuration'
            });
        }
    }

    /**
     * Bulk update configurations
     */
    public static async bulkUpdateConfigurations(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { configurations } = req.body;
            const updatedBy = req.admin!.id;

            // Validate input
            if (!Array.isArray(configurations)) {
                res.status(400).json({
                    success: false,
                    message: 'Configurations must be an array'
                });
                return;
            }

            // Validate each configuration
            for (const config of configurations) {
                if (!config.category || !config.key || config.value === undefined) {
                    res.status(400).json({
                        success: false,
                        message: 'Each configuration must have category, key, and value'
                    });
                    return;
                }
            }

            const results = await ConfigurationService.bulkUpdateConfigurations(configurations, updatedBy);

            res.json({
                success: true,
                message: `${results.length} configurations updated successfully`,
                data: results
            });
        } catch (error: any) {
            logger.error('Bulk update configurations error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update configurations'
            });
        }
    }

    /**
     * Export configurations
     */
    public static async exportConfigurations(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const category = req.query.category as string;
            const includeSensitive = req.query.includeSensitive === 'true';

            const configurations = await ConfigurationService.exportConfigurations(category, includeSensitive);

            res.json({
                success: true,
                data: configurations
            });
        } catch (error: any) {
            logger.error('Export configurations error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to export configurations'
            });
        }
    }

    /**
     * Import configurations
     */
    public static async importConfigurations(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { configurations, overwriteExisting } = req.body;
            const updatedBy = req.admin!.id;

            // Validate input
            if (!configurations || typeof configurations !== 'object') {
                res.status(400).json({
                    success: false,
                    message: 'Configurations object is required'
                });
                return;
            }

            const result = await ConfigurationService.importConfigurations(
                configurations,
                updatedBy,
                overwriteExisting || false
            );

            res.json({
                success: true,
                message: 'Configurations imported successfully',
                data: result
            });
        } catch (error: any) {
            logger.error('Import configurations error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to import configurations'
            });
        }
    }

    /**
     * Get configuration value with default
     */
    public static async getConfigurationValue(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { category, key } = req.params;
            const defaultValue = req.query.default;

            const value = await ConfigurationService.getConfigurationValue(
                category,
                key,
                defaultValue
            );

            res.json({
                success: true,
                data: {
                    category,
                    key,
                    value
                }
            });
        } catch (error: any) {
            logger.error('Get configuration value error:', error);
            res.status(404).json({
                success: false,
                message: error.message || 'Configuration not found'
            });
        }
    }
}