#!/usr/bin/env node

/**
 * Automated Documentation Generation Script
 * 
 * This script generates comprehensive documentation from code comments,
 * TypeScript interfaces, and API endpoints across all services.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    servicesDir: path.join(__dirname, '..', 'services'),
    docsDir: path.join(__dirname, '..', 'docs'),
    outputDir: path.join(__dirname, '..', 'docs', 'generated'),
    excludePatterns: [
        'node_modules',
        'dist',
        'build',
        '.git',
        'coverage',
        '*.test.ts',
        '*.spec.ts'
    ]
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Main documentation generation function
 */
async function generateDocumentation() {
    console.log('🚀 Starting automated documentation generation...\n');

    try {
        // Generate TypeDoc documentation for each service
        await generateTypeDocumentation();

        // Generate API documentation from Swagger/OpenAPI comments
        await generateSwaggerDocumentation();

        // Generate service overview documentation
        await generateServiceOverview();

        // Generate database schema documentation
        await generateDatabaseDocumentation();

        // Generate README files for undocumented services
        await generateMissingReadmes();

        // Generate index file
        await generateDocumentationIndex();

        console.log('✅ Documentation generation completed successfully!');
        console.log(`📁 Generated documentation available at: ${CONFIG.outputDir}`);

    } catch (error) {
        console.error('❌ Documentation generation failed:', error.message);
        process.exit(1);
    }
}

/**
 * Generate TypeDoc documentation for TypeScript code
 */
async function generateTypeDocumentation() {
    console.log('📚 Generating TypeScript documentation with TypeDoc...');

    const services = getServiceDirectories();

    for (const service of services) {
        const servicePath = path.join(CONFIG.servicesDir, service);
        const srcPath = path.join(servicePath, 'src');

        if (!fs.existsSync(srcPath)) {
            console.log(`⚠️  Skipping ${service} - no src directory found`);
            continue;
        }

        const outputPath = path.join(CONFIG.outputDir, 'typedoc', service);

        try {
            // Check if TypeDoc is available
            execSync('npx typedoc --version', { stdio: 'ignore' });

            // Generate TypeDoc documentation
            const command = `npx typedoc --out "${outputPath}" --entryPoints "${srcPath}/index.ts" --entryPoints "${srcPath}/**/*.ts" --exclude "**/*.test.ts" --exclude "**/*.spec.ts" --theme default --name "${service} API Documentation"`;

            execSync(command, {
                cwd: servicePath,
                stdio: 'pipe'
            });

            console.log(`  ✅ Generated TypeDoc for ${service}`);

        } catch (error) {
            console.log(`  ⚠️  Failed to generate TypeDoc for ${service}: ${error.message}`);
        }
    }
}

/**
 * Generate Swagger/OpenAPI documentation from code comments
 */
async function generateSwaggerDocumentation() {
    console.log('📖 Generating Swagger documentation from code comments...');

    const services = getServiceDirectories();

    for (const service of services) {
        const servicePath = path.join(CONFIG.servicesDir, service);
        const srcPath = path.join(servicePath, 'src');

        if (!fs.existsSync(srcPath)) continue;

        try {
            // Look for swagger-jsdoc configuration or comments
            const swaggerComments = await extractSwaggerComments(srcPath);

            if (swaggerComments.length > 0) {
                const swaggerSpec = generateSwaggerSpec(service, swaggerComments);
                const outputPath = path.join(CONFIG.outputDir, 'swagger', `${service}.json`);

                // Ensure directory exists
                fs.mkdirSync(path.dirname(outputPath), { recursive: true });

                // Write swagger specification
                fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));

                console.log(`  ✅ Generated Swagger spec for ${service}`);
            }

        } catch (error) {
            console.log(`  ⚠️  Failed to generate Swagger for ${service}: ${error.message}`);
        }
    }
}

/**
 * Generate service overview documentation
 */
async function generateServiceOverview() {
    console.log('📋 Generating service overview documentation...');

    const services = getServiceDirectories();
    const serviceOverviews = [];

    for (const service of services) {
        const servicePath = path.join(CONFIG.servicesDir, service);
        const packageJsonPath = path.join(servicePath, 'package.json');
        const readmePath = path.join(servicePath, 'README.md');

        let serviceInfo = {
            name: service,
            description: 'No description available',
            version: '1.0.0',
            port: 'Unknown',
            endpoints: [],
            dependencies: [],
            hasReadme: fs.existsSync(readmePath),
            hasTests: false
        };

        // Read package.json for service information
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                serviceInfo.description = packageJson.description || serviceInfo.description;
                serviceInfo.version = packageJson.version || serviceInfo.version;
                serviceInfo.dependencies = Object.keys(packageJson.dependencies || {});

                // Check for test scripts
                serviceInfo.hasTests = !!(packageJson.scripts && (
                    packageJson.scripts.test ||
                    packageJson.scripts['test:unit'] ||
                    packageJson.scripts['test:integration']
                ));

            } catch (error) {
                console.log(`  ⚠️  Failed to read package.json for ${service}`);
            }
        }

        // Extract API endpoints from route files
        serviceInfo.endpoints = await extractApiEndpoints(servicePath);

        // Try to determine port from environment or config files
        serviceInfo.port = await extractServicePort(servicePath);

        serviceOverviews.push(serviceInfo);
    }

    // Generate overview markdown
    const overviewContent = generateServiceOverviewMarkdown(serviceOverviews);
    const outputPath = path.join(CONFIG.outputDir, 'service-overview.md');
    fs.writeFileSync(outputPath, overviewContent);

    console.log('  ✅ Generated service overview documentation');
}

/**
 * Generate database schema documentation
 */
async function generateDatabaseDocumentation() {
    console.log('🗄️  Generating database schema documentation...');

    const services = getServiceDirectories();
    const schemaInfo = [];

    for (const service of services) {
        const servicePath = path.join(CONFIG.servicesDir, service);

        // Look for database-related files
        const dbFiles = await findDatabaseFiles(servicePath);

        if (dbFiles.length > 0) {
            const serviceSchema = {
                service,
                tables: [],
                migrations: [],
                models: []
            };

            for (const file of dbFiles) {
                if (file.includes('migration') || file.includes('schema')) {
                    serviceSchema.migrations.push(path.relative(servicePath, file));
                } else if (file.includes('model') || file.includes('entity')) {
                    serviceSchema.models.push(path.relative(servicePath, file));
                }
            }

            // Extract table information from SQL files or TypeScript models
            serviceSchema.tables = await extractTableInfo(dbFiles);

            if (serviceSchema.tables.length > 0 || serviceSchema.models.length > 0) {
                schemaInfo.push(serviceSchema);
            }
        }
    }

    if (schemaInfo.length > 0) {
        const schemaContent = generateDatabaseSchemaMarkdown(schemaInfo);
        const outputPath = path.join(CONFIG.outputDir, 'database-schema.md');
        fs.writeFileSync(outputPath, schemaContent);

        console.log('  ✅ Generated database schema documentation');
    }
}

/**
 * Generate README files for services that don't have them
 */
async function generateMissingReadmes() {
    console.log('📝 Generating missing README files...');

    const services = getServiceDirectories();
    let generatedCount = 0;

    for (const service of services) {
        const servicePath = path.join(CONFIG.servicesDir, service);
        const readmePath = path.join(servicePath, 'README.md');

        if (!fs.existsSync(readmePath)) {
            const readmeContent = await generateServiceReadme(service, servicePath);
            fs.writeFileSync(readmePath, readmeContent);
            generatedCount++;
            console.log(`  ✅ Generated README for ${service}`);
        }
    }

    if (generatedCount === 0) {
        console.log('  ℹ️  All services already have README files');
    }
}

/**
 * Generate documentation index file
 */
async function generateDocumentationIndex() {
    console.log('📑 Generating documentation index...');

    const indexContent = `# Generated Documentation

This directory contains automatically generated documentation from the codebase.

## Contents

### Service Documentation
- [Service Overview](./service-overview.md) - Overview of all services
- [Database Schema](./database-schema.md) - Database schema documentation

### API Documentation
- [Swagger Specifications](./swagger/) - OpenAPI/Swagger specifications
- [TypeDoc Documentation](./typedoc/) - TypeScript API documentation

### Generated Files
Generated on: ${new Date().toISOString()}

## Services

${getServiceDirectories().map(service => `- [${service}](../services/${service}/README.md)`).join('\n')}

## Usage

### Viewing TypeDoc Documentation
Open the HTML files in the \`typedoc/\` directory in a web browser.

### Using Swagger Specifications
Import the JSON files from the \`swagger/\` directory into Swagger UI or Postman.

### Regenerating Documentation
Run the documentation generation script:

\`\`\`bash
npm run docs:generate
# or
node scripts/generate-docs.js
\`\`\`

## Automation

This documentation is automatically generated from:
- TypeScript interfaces and JSDoc comments
- Swagger/OpenAPI comments in route files
- Database schema files and migrations
- Package.json files and service configurations

To keep documentation up to date, run the generation script after making changes to:
- API endpoints
- Database schemas
- Service configurations
- TypeScript interfaces
`;

    const outputPath = path.join(CONFIG.outputDir, 'README.md');
    fs.writeFileSync(outputPath, indexContent);

    console.log('  ✅ Generated documentation index');
}

// Helper functions

/**
 * Get list of service directories
 */
function getServiceDirectories() {
    if (!fs.existsSync(CONFIG.servicesDir)) {
        return [];
    }

    return fs.readdirSync(CONFIG.servicesDir)
        .filter(item => {
            const itemPath = path.join(CONFIG.servicesDir, item);
            return fs.statSync(itemPath).isDirectory() &&
                !item.startsWith('.') &&
                !item.startsWith('_');
        });
}

/**
 * Extract Swagger comments from source files
 */
async function extractSwaggerComments(srcPath) {
    const comments = [];

    function processFile(filePath) {
        if (!filePath.endsWith('.ts') && !filePath.endsWith('.js')) return;

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const swaggerRegex = /\/\*\*[\s\S]*?@swagger[\s\S]*?\*\//g;
            const matches = content.match(swaggerRegex);

            if (matches) {
                comments.push(...matches);
            }
        } catch (error) {
            // Ignore file read errors
        }
    }

    function walkDirectory(dir) {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);

            if (stat.isDirectory() && !CONFIG.excludePatterns.some(pattern => item.includes(pattern))) {
                walkDirectory(itemPath);
            } else if (stat.isFile()) {
                processFile(itemPath);
            }
        }
    }

    walkDirectory(srcPath);
    return comments;
}

/**
 * Generate Swagger specification from comments
 */
function generateSwaggerSpec(serviceName, comments) {
    return {
        openapi: '3.0.3',
        info: {
            title: `${serviceName} API`,
            description: `API documentation for ${serviceName}`,
            version: '1.0.0'
        },
        servers: [
            {
                url: `http://localhost:3000/${serviceName}`,
                description: 'Development server'
            }
        ],
        paths: {},
        components: {
            schemas: {},
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        // Note: In a real implementation, you would parse the comments
        // and extract actual path and schema definitions
        _rawComments: comments
    };
}

/**
 * Extract API endpoints from route files
 */
async function extractApiEndpoints(servicePath) {
    const endpoints = [];
    const routesPath = path.join(servicePath, 'src', 'routes');

    if (!fs.existsSync(routesPath)) {
        return endpoints;
    }

    function processRouteFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');

            // Simple regex to find route definitions
            const routeRegex = /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
            let match;

            while ((match = routeRegex.exec(content)) !== null) {
                endpoints.push({
                    method: match[1].toUpperCase(),
                    path: match[2],
                    file: path.relative(servicePath, filePath)
                });
            }
        } catch (error) {
            // Ignore file read errors
        }
    }

    function walkRoutes(dir) {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir);

        for (const item of items) {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
                walkRoutes(itemPath);
            } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
                processRouteFile(itemPath);
            }
        }
    }

    walkRoutes(routesPath);
    return endpoints;
}

/**
 * Extract service port from configuration
 */
async function extractServicePort(servicePath) {
    // Check common configuration files
    const configFiles = [
        path.join(servicePath, '.env'),
        path.join(servicePath, '.env.example'),
        path.join(servicePath, 'src', 'config', 'index.ts'),
        path.join(servicePath, 'src', 'app.ts')
    ];

    for (const configFile of configFiles) {
        if (fs.existsSync(configFile)) {
            try {
                const content = fs.readFileSync(configFile, 'utf8');

                // Look for port configuration
                const portMatch = content.match(/PORT\s*[=:]\s*(\d+)/i);
                if (portMatch) {
                    return portMatch[1];
                }

                // Look for listen calls
                const listenMatch = content.match(/\.listen\s*\(\s*(\d+)/);
                if (listenMatch) {
                    return listenMatch[1];
                }
            } catch (error) {
                // Ignore file read errors
            }
        }
    }

    return 'Unknown';
}

/**
 * Find database-related files
 */
async function findDatabaseFiles(servicePath) {
    const dbFiles = [];

    function walkDirectory(dir) {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir);

        for (const item of items) {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);

            if (stat.isDirectory() && !CONFIG.excludePatterns.some(pattern => item.includes(pattern))) {
                walkDirectory(itemPath);
            } else if (stat.isFile()) {
                const fileName = item.toLowerCase();
                if (fileName.includes('migration') ||
                    fileName.includes('schema') ||
                    fileName.includes('model') ||
                    fileName.includes('entity') ||
                    fileName.endsWith('.sql')) {
                    dbFiles.push(itemPath);
                }
            }
        }
    }

    walkDirectory(servicePath);
    return dbFiles;
}

/**
 * Extract table information from database files
 */
async function extractTableInfo(dbFiles) {
    const tables = [];

    for (const file of dbFiles) {
        try {
            const content = fs.readFileSync(file, 'utf8');

            // Extract CREATE TABLE statements
            const tableRegex = /CREATE\s+TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi;
            let match;

            while ((match = tableRegex.exec(content)) !== null) {
                const tableName = match[1];
                const tableDefinition = match[2];

                // Extract column information (simplified)
                const columns = tableDefinition
                    .split(',')
                    .map(col => col.trim())
                    .filter(col => col && !col.startsWith('CONSTRAINT'))
                    .map(col => {
                        const parts = col.split(/\s+/);
                        return {
                            name: parts[0],
                            type: parts[1] || 'UNKNOWN',
                            constraints: parts.slice(2).join(' ')
                        };
                    });

                tables.push({
                    name: tableName,
                    columns,
                    file: path.basename(file)
                });
            }
        } catch (error) {
            // Ignore file read errors
        }
    }

    return tables;
}

/**
 * Generate service overview markdown
 */
function generateServiceOverviewMarkdown(serviceOverviews) {
    let content = `# Service Overview

This document provides an overview of all services in the multi-service platform.

Generated on: ${new Date().toISOString()}

## Services Summary

| Service | Description | Version | Port | Endpoints | Tests |
|---------|-------------|---------|------|-----------|-------|
`;

    for (const service of serviceOverviews) {
        content += `| ${service.name} | ${service.description} | ${service.version} | ${service.port} | ${service.endpoints.length} | ${service.hasTests ? '✅' : '❌'} |\n`;
    }

    content += `\n## Detailed Service Information\n\n`;

    for (const service of serviceOverviews) {
        content += `### ${service.name}\n\n`;
        content += `**Description:** ${service.description}\n\n`;
        content += `**Version:** ${service.version}\n\n`;
        content += `**Port:** ${service.port}\n\n`;
        content += `**Has README:** ${service.hasReadme ? '✅' : '❌'}\n\n`;
        content += `**Has Tests:** ${service.hasTests ? '✅' : '❌'}\n\n`;

        if (service.endpoints.length > 0) {
            content += `**API Endpoints:**\n\n`;
            content += `| Method | Path | File |\n`;
            content += `|--------|------|------|\n`;

            for (const endpoint of service.endpoints) {
                content += `| ${endpoint.method} | ${endpoint.path} | ${endpoint.file} |\n`;
            }
            content += `\n`;
        }

        if (service.dependencies.length > 0) {
            content += `**Key Dependencies:**\n`;
            content += service.dependencies.slice(0, 10).map(dep => `- ${dep}`).join('\n');
            content += service.dependencies.length > 10 ? `\n- ... and ${service.dependencies.length - 10} more` : '';
            content += `\n\n`;
        }

        content += `---\n\n`;
    }

    return content;
}

/**
 * Generate database schema markdown
 */
function generateDatabaseSchemaMarkdown(schemaInfo) {
    let content = `# Database Schema Documentation

This document provides an overview of database schemas across all services.

Generated on: ${new Date().toISOString()}

`;

    for (const serviceSchema of schemaInfo) {
        content += `## ${serviceSchema.service}\n\n`;

        if (serviceSchema.tables.length > 0) {
            content += `### Tables\n\n`;

            for (const table of serviceSchema.tables) {
                content += `#### ${table.name}\n\n`;
                content += `**Source:** ${table.file}\n\n`;

                if (table.columns.length > 0) {
                    content += `| Column | Type | Constraints |\n`;
                    content += `|--------|------|-------------|\n`;

                    for (const column of table.columns) {
                        content += `| ${column.name} | ${column.type} | ${column.constraints} |\n`;
                    }
                    content += `\n`;
                }
            }
        }

        if (serviceSchema.migrations.length > 0) {
            content += `### Migration Files\n\n`;
            for (const migration of serviceSchema.migrations) {
                content += `- ${migration}\n`;
            }
            content += `\n`;
        }

        if (serviceSchema.models.length > 0) {
            content += `### Model Files\n\n`;
            for (const model of serviceSchema.models) {
                content += `- ${model}\n`;
            }
            content += `\n`;
        }

        content += `---\n\n`;
    }

    return content;
}

/**
 * Generate README content for a service
 */
async function generateServiceReadme(serviceName, servicePath) {
    const packageJsonPath = path.join(servicePath, 'package.json');
    let description = 'Service description not available';
    let version = '1.0.0';
    let scripts = {};

    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            description = packageJson.description || description;
            version = packageJson.version || version;
            scripts = packageJson.scripts || {};
        } catch (error) {
            // Use defaults
        }
    }

    const endpoints = await extractApiEndpoints(servicePath);
    const port = await extractServicePort(servicePath);

    return `# ${serviceName}

${description}

## Version

${version}

## Development

### Prerequisites
- Node.js 18+
- pnpm
- PostgreSQL (if applicable)
- Redis (if applicable)

### Setup
\`\`\`bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start the service
pnpm run dev
\`\`\`

### Environment Variables
Check \`.env.example\` for required environment variables.

## API Endpoints

${endpoints.length > 0 ? `
| Method | Path | Description |
|--------|------|-------------|
${endpoints.map(ep => `| ${ep.method} | ${ep.path} | - |`).join('\n')}
` : 'No API endpoints documented.'}

## Scripts

${Object.keys(scripts).length > 0 ? `
| Script | Description |
|--------|-------------|
${Object.entries(scripts).map(([name, cmd]) => `| \`pnpm run ${name}\` | ${cmd} |`).join('\n')}
` : 'No scripts available.'}

## Service Information

- **Port:** ${port}
- **Service Type:** Microservice
- **Generated:** ${new Date().toISOString()}

## Documentation

- [API Documentation](../../docs/api/${serviceName}.yaml) - OpenAPI specification
- [Architecture Documentation](../../docs/architecture/) - System architecture
- [Development Guide](../../docs/development/) - Development guidelines

## Testing

\`\`\`bash
# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Run integration tests
pnpm run test:integration
\`\`\`

## Deployment

See the [deployment documentation](../../docs/deployment/) for deployment instructions.

---

*This README was automatically generated. Please update it with service-specific information.*
`;
}

// Run the documentation generation
if (require.main === module) {
    generateDocumentation().catch(console.error);
}

module.exports = {
    generateDocumentation,
    CONFIG
};