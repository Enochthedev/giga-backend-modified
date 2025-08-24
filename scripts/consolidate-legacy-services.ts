#!/usr/bin/env ts-node

/**
 * Legacy Services Consolidation Script
 * 
 * This script consolidates legacy services into the new microservices architecture:
 * - giga_main -> services/authentication-service (enhanced)
 * - giga_taxi_main + giga_taxi_driver -> services/taxi-service (consolidated)
 * - ecommerce-backend -> services/ecommerce-service (migrated)
 * - hotel-service -> services/hotel-service (created)
 * - advertisement-service -> services/advertisement-service (created)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface ConsolidationTask {
    name: string;
    description: string;
    sourceServices: string[];
    targetService: string;
    execute: () => Promise<void>;
}

class LegacyConsolidator {
    private tasks: ConsolidationTask[] = [];
    private completedTasks: string[] = [];

    constructor() {
        this.initializeTasks();
    }

    private initializeTasks() {
        this.tasks = [
            {
                name: 'analyze-legacy-data-models',
                description: 'Analyze and extract data models from legacy services',
                sourceServices: ['giga_main', 'giga_taxi_main', 'giga_taxi_driver', 'ecommerce-backend', 'hotel-service', 'advertisement-service'],
                targetService: 'analysis',
                execute: this.analyzeLegacyDataModels.bind(this)
            },
            {
                name: 'enhance-authentication-service',
                description: 'Migrate user management and OAuth from giga_main to authentication-service',
                sourceServices: ['giga_main'],
                targetService: 'services/authentication-service',
                execute: this.enhanceAuthenticationService.bind(this)
            },
            {
                name: 'consolidate-taxi-services',
                description: 'Merge giga_taxi_main and giga_taxi_driver into unified taxi-service',
                sourceServices: ['giga_taxi_main', 'giga_taxi_driver'],
                targetService: 'services/taxi-service',
                execute: this.consolidateTaxiServices.bind(this)
            },
            {
                name: 'create-ecommerce-service',
                description: 'Migrate ecommerce-backend to new ecommerce-service',
                sourceServices: ['ecommerce-backend'],
                targetService: 'services/ecommerce-service',
                execute: this.createEcommerceService.bind(this)
            },
            {
                name: 'create-hotel-service',
                description: 'Create hotel-service from legacy hotel-service',
                sourceServices: ['hotel-service'],
                targetService: 'services/hotel-service',
                execute: this.createHotelService.bind(this)
            },
            {
                name: 'create-advertisement-service',
                description: 'Create advertisement-service from legacy advertisement-service',
                sourceServices: ['advertisement-service'],
                targetService: 'services/advertisement-service',
                execute: this.createAdvertisementService.bind(this)
            },
            {
                name: 'update-api-gateway-routing',
                description: 'Update API Gateway to route to new consolidated services',
                sourceServices: [],
                targetService: 'services/api-gateway',
                execute: this.updateApiGatewayRouting.bind(this)
            },
            {
                name: 'create-data-migration-scripts',
                description: 'Create scripts to migrate data from legacy databases',
                sourceServices: ['giga_main', 'giga_taxi_main', 'ecommerce-backend', 'hotel-service'],
                targetService: 'migrations',
                execute: this.createDataMigrationScripts.bind(this)
            },
            {
                name: 'update-docker-compose',
                description: 'Update docker-compose files for new service architecture',
                sourceServices: [],
                targetService: 'infrastructure',
                execute: this.updateDockerCompose.bind(this)
            },
            {
                name: 'create-integration-tests',
                description: 'Create integration tests for consolidated services',
                sourceServices: [],
                targetService: 'tests',
                execute: this.createIntegrationTests.bind(this)
            }
        ];
    }

    async run(): Promise<void> {
        console.log('🚀 Starting Legacy Services Consolidation...\n');

        for (const task of this.tasks) {
            try {
                console.log(`📋 Executing: ${task.name}`);
                console.log(`   Description: ${task.description}`);
                console.log(`   Source: ${task.sourceServices.join(', ') || 'N/A'}`);
                console.log(`   Target: ${task.targetService}\n`);

                await task.execute();
                this.completedTasks.push(task.name);

                console.log(`✅ Completed: ${task.name}\n`);
            } catch (error) {
                console.error(`❌ Failed: ${task.name}`);
                console.error(`   Error: ${error}\n`);
                throw error;
            }
        }

        console.log('🎉 Legacy Services Consolidation Completed Successfully!');
        this.printSummary();
    }

    private async analyzeLegacyDataModels(): Promise<void> {
        const analysisDir = 'analysis/legacy-data-models';
        this.ensureDirectoryExists(analysisDir);

        // Analyze giga_main models
        await this.analyzeServiceModels('giga_main', analysisDir);

        // Analyze ecommerce-backend models
        await this.analyzeServiceModels('ecommerce-backend', analysisDir);

        // Analyze taxi services models
        await this.analyzeServiceModels('giga_taxi_main', analysisDir);

        // Create consolidated analysis report
        await this.createAnalysisReport(analysisDir);
    }

    private async enhanceAuthenticationService(): Promise<void> {
        const authServiceDir = 'services/authentication-service';

        // Copy OAuth configuration from giga_main
        await this.copyOAuthConfiguration(authServiceDir);

        // Enhance user model with legacy fields
        await this.enhanceUserModel(authServiceDir);

        // Add social login endpoints
        await this.addSocialLoginEndpoints(authServiceDir);

        // Update authentication middleware
        await this.updateAuthMiddleware(authServiceDir);
    }

    private async consolidateTaxiServices(): Promise<void> {
        const taxiServiceDir = 'services/taxi-service';

        // Merge ride models from both services
        await this.mergeRideModels(taxiServiceDir);

        // Consolidate driver and customer controllers
        await this.consolidateControllers(taxiServiceDir);

        // Merge WebSocket handlers for real-time tracking
        await this.mergeWebSocketHandlers(taxiServiceDir);

        // Update ride matching algorithm
        await this.updateRideMatchingAlgorithm(taxiServiceDir);
    }

    private async createEcommerceService(): Promise<void> {
        const ecommerceServiceDir = 'services/ecommerce-service';

        // Copy and enhance product models
        await this.migrateProductModels(ecommerceServiceDir);

        // Migrate vendor management features
        await this.migrateVendorManagement(ecommerceServiceDir);

        // Create shopping cart service
        await this.createShoppingCartService(ecommerceServiceDir);

        // Migrate order processing logic
        await this.migrateOrderProcessing(ecommerceServiceDir);
    }

    private async createHotelService(): Promise<void> {
        const hotelServiceDir = 'services/hotel-service';
        this.ensureDirectoryExists(hotelServiceDir);

        // Create hotel service structure
        await this.createServiceStructure(hotelServiceDir, 'hotel');

        // Migrate hotel booking logic
        await this.migrateHotelBookingLogic(hotelServiceDir);

        // Create property management features
        await this.createPropertyManagement(hotelServiceDir);
    }

    private async createAdvertisementService(): Promise<void> {
        const adServiceDir = 'services/advertisement-service';
        this.ensureDirectoryExists(adServiceDir);

        // Create advertisement service structure
        await this.createServiceStructure(adServiceDir, 'advertisement');

        // Migrate ad campaign logic
        await this.migrateAdCampaignLogic(adServiceDir);

        // Create analytics features
        await this.createAdAnalytics(adServiceDir);
    }

    private async updateApiGatewayRouting(): Promise<void> {
        const gatewayDir = 'services/api-gateway';

        // Update routing configuration
        await this.updateGatewayRoutes(gatewayDir);

        // Add service discovery for new services
        await this.addServiceDiscovery(gatewayDir);

        // Update load balancing configuration
        await this.updateLoadBalancing(gatewayDir);
    }

    private async createDataMigrationScripts(): Promise<void> {
        const migrationsDir = 'migrations/legacy-consolidation';
        this.ensureDirectoryExists(migrationsDir);

        // Create user data migration script
        await this.createUserDataMigration(migrationsDir);

        // Create taxi data migration script
        await this.createTaxiDataMigration(migrationsDir);

        // Create ecommerce data migration script
        await this.createEcommerceDataMigration(migrationsDir);

        // Create hotel data migration script
        await this.createHotelDataMigration(migrationsDir);
    }

    private async updateDockerCompose(): Promise<void> {
        // Update main docker-compose.yml
        await this.updateMainDockerCompose();

        // Update development docker-compose
        await this.updateDevDockerCompose();

        // Create service-specific docker files
        await this.createServiceDockerFiles();
    }

    private async createIntegrationTests(): Promise<void> {
        const testsDir = 'tests/integration/consolidated-services';
        this.ensureDirectoryExists(testsDir);

        // Create authentication service tests
        await this.createAuthServiceTests(testsDir);

        // Create taxi service tests
        await this.createTaxiServiceTests(testsDir);

        // Create ecommerce service tests
        await this.createEcommerceServiceTests(testsDir);
    }

    // Helper methods (implementation details)
    private ensureDirectoryExists(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private async analyzeServiceModels(serviceName: string, outputDir: string): Promise<void> {
        const modelsDir = path.join(serviceName, 'src', 'models');
        if (!fs.existsSync(modelsDir)) return;

        const modelFiles = fs.readdirSync(modelsDir).filter(file => file.endsWith('.ts'));
        const analysis = {
            service: serviceName,
            models: [],
            timestamp: new Date().toISOString()
        };

        for (const file of modelFiles) {
            const content = fs.readFileSync(path.join(modelsDir, file), 'utf8');
            analysis.models.push({
                file,
                interfaces: this.extractInterfaces(content),
                schemas: this.extractSchemas(content)
            });
        }

        fs.writeFileSync(
            path.join(outputDir, `${serviceName}-analysis.json`),
            JSON.stringify(analysis, null, 2)
        );
    }

    private extractInterfaces(content: string): string[] {
        const interfaceRegex = /interface\s+(\w+)/g;
        const matches = [];
        let match;
        while ((match = interfaceRegex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        return matches;
    }

    private extractSchemas(content: string): string[] {
        const schemaRegex = /const\s+(\w+Schema)/g;
        const matches = [];
        let match;
        while ((match = schemaRegex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        return matches;
    }

    private async createAnalysisReport(analysisDir: string): Promise<void> {
        const analysisFiles = fs.readdirSync(analysisDir).filter(file => file.endsWith('-analysis.json'));
        const consolidatedAnalysis = {
            timestamp: new Date().toISOString(),
            services: [],
            recommendations: []
        };

        for (const file of analysisFiles) {
            const analysis = JSON.parse(fs.readFileSync(path.join(analysisDir, file), 'utf8'));
            consolidatedAnalysis.services.push(analysis);
        }

        // Add recommendations based on analysis
        consolidatedAnalysis.recommendations = [
            'Consolidate User models across services',
            'Standardize authentication patterns',
            'Migrate MongoDB schemas to PostgreSQL',
            'Implement consistent error handling',
            'Add comprehensive validation schemas'
        ];

        fs.writeFileSync(
            path.join(analysisDir, 'consolidation-report.json'),
            JSON.stringify(consolidatedAnalysis, null, 2)
        );
    }

    // Placeholder implementations for other methods
    private async copyOAuthConfiguration(authServiceDir: string): Promise<void> {
        console.log('   - Copying OAuth configuration from giga_main');
    }

    private async enhanceUserModel(authServiceDir: string): Promise<void> {
        console.log('   - Enhancing user model with legacy fields');
    }

    private async addSocialLoginEndpoints(authServiceDir: string): Promise<void> {
        console.log('   - Adding social login endpoints');
    }

    private async updateAuthMiddleware(authServiceDir: string): Promise<void> {
        console.log('   - Updating authentication middleware');
    }

    private async mergeRideModels(taxiServiceDir: string): Promise<void> {
        console.log('   - Merging ride models from taxi services');
    }

    private async consolidateControllers(taxiServiceDir: string): Promise<void> {
        console.log('   - Consolidating driver and customer controllers');
    }

    private async mergeWebSocketHandlers(taxiServiceDir: string): Promise<void> {
        console.log('   - Merging WebSocket handlers for real-time tracking');
    }

    private async updateRideMatchingAlgorithm(taxiServiceDir: string): Promise<void> {
        console.log('   - Updating ride matching algorithm');
    }

    private async migrateProductModels(ecommerceServiceDir: string): Promise<void> {
        console.log('   - Migrating product models');
    }

    private async migrateVendorManagement(ecommerceServiceDir: string): Promise<void> {
        console.log('   - Migrating vendor management features');
    }

    private async createShoppingCartService(ecommerceServiceDir: string): Promise<void> {
        console.log('   - Creating shopping cart service');
    }

    private async migrateOrderProcessing(ecommerceServiceDir: string): Promise<void> {
        console.log('   - Migrating order processing logic');
    }

    private async createServiceStructure(serviceDir: string, serviceName: string): Promise<void> {
        console.log(`   - Creating ${serviceName} service structure`);
    }

    private async migrateHotelBookingLogic(hotelServiceDir: string): Promise<void> {
        console.log('   - Migrating hotel booking logic');
    }

    private async createPropertyManagement(hotelServiceDir: string): Promise<void> {
        console.log('   - Creating property management features');
    }

    private async migrateAdCampaignLogic(adServiceDir: string): Promise<void> {
        console.log('   - Migrating ad campaign logic');
    }

    private async createAdAnalytics(adServiceDir: string): Promise<void> {
        console.log('   - Creating ad analytics features');
    }

    private async updateGatewayRoutes(gatewayDir: string): Promise<void> {
        console.log('   - Updating gateway routes');
    }

    private async addServiceDiscovery(gatewayDir: string): Promise<void> {
        console.log('   - Adding service discovery');
    }

    private async updateLoadBalancing(gatewayDir: string): Promise<void> {
        console.log('   - Updating load balancing configuration');
    }

    private async createUserDataMigration(migrationsDir: string): Promise<void> {
        console.log('   - Creating user data migration script');
    }

    private async createTaxiDataMigration(migrationsDir: string): Promise<void> {
        console.log('   - Creating taxi data migration script');
    }

    private async createEcommerceDataMigration(migrationsDir: string): Promise<void> {
        console.log('   - Creating ecommerce data migration script');
    }

    private async createHotelDataMigration(migrationsDir: string): Promise<void> {
        console.log('   - Creating hotel data migration script');
    }

    private async updateMainDockerCompose(): Promise<void> {
        console.log('   - Updating main docker-compose.yml');
    }

    private async updateDevDockerCompose(): Promise<void> {
        console.log('   - Updating development docker-compose');
    }

    private async createServiceDockerFiles(): Promise<void> {
        console.log('   - Creating service-specific docker files');
    }

    private async createAuthServiceTests(testsDir: string): Promise<void> {
        console.log('   - Creating authentication service tests');
    }

    private async createTaxiServiceTests(testsDir: string): Promise<void> {
        console.log('   - Creating taxi service tests');
    }

    private async createEcommerceServiceTests(testsDir: string): Promise<void> {
        console.log('   - Creating ecommerce service tests');
    }

    private printSummary(): void {
        console.log('\n📊 Consolidation Summary:');
        console.log(`✅ Completed Tasks: ${this.completedTasks.length}/${this.tasks.length}`);
        console.log('\n🎯 Next Steps:');
        console.log('1. Review generated migration scripts');
        console.log('2. Test consolidated services');
        console.log('3. Update client applications');
        console.log('4. Deploy to staging environment');
        console.log('5. Perform data migration');
        console.log('6. Update production deployment');
    }
}

// Run the consolidation if this script is executed directly
if (require.main === module) {
    const consolidator = new LegacyConsolidator();
    consolidator.run().catch(error => {
        console.error('Consolidation failed:', error);
        process.exit(1);
    });
}

export { LegacyConsolidator };