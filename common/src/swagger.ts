import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

export function setupSwagger(app: Express, title: string) {
  const options = {
    definition: {
      openapi: '3.0.0',
      info: { title, version: '1.0.0' }
    },
    apis: ['./src/routes/**/*.ts']
  };

  const specs = swaggerJsdoc(options);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
}
