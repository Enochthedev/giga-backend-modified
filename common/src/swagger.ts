import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

export interface SwaggerOptions {
  title: string;
  version?: string;
  description?: string;
  apis?: string[];
  customCss?: string;
  customSiteTitle?: string;
  customfavIcon?: string;
  swaggerOptions?: any;
}

export function setupSwagger(app: Express, options: SwaggerOptions | string) {
  // Handle both string (title) and object (options) parameters for backward compatibility
  const config: SwaggerOptions = typeof options === 'string' ? { title: options } : options;
  
  const defaultApis = [
    './src/routes/**/*.ts',
    './src/docs/**/*.ts',
    './src/swagger/**/*.ts'
  ];

  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: config.title,
        version: config.version || '1.0.0',
        description: config.description || `${config.title} API Documentation`,
        contact: {
          name: 'Giga Backend Team',
          email: 'support@giga-backend.com'
        },
        servers: [
          {
            url: process.env.API_BASE_URL || 'http://localhost:3000',
            description: 'Development server'
          }
        ]
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token for authentication'
          }
        }
      },
      security: [
        {
          BearerAuth: []
        }
      ]
    },
    apis: config.apis || defaultApis,
    failOnErrors: false,
    verbose: true
  };

  const specs = swaggerJsdoc(swaggerOptions);
  
  // Custom Swagger UI options
  const uiOptions = {
    customCss: config.customCss || '.swagger-ui .topbar { display: none }',
    customSiteTitle: config.customSiteTitle || `${config.title} API Docs`,
    customfavIcon: config.customfavIcon || '/favicon.ico',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
      ...config.swaggerOptions
    }
  };

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, uiOptions));
  
  // Add a simple endpoint to check if Swagger is working
  app.get('/docs-json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  return specs;
}

// Convenience function for backward compatibility
export function setupBasicSwagger(app: Express, title: string) {
  return setupSwagger(app, { title });
}
