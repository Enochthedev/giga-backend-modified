import express from 'express';
import mongoose from 'mongoose';
import * as dotEnv from 'dotenv';
import router from './routes/routesConfig';
import ApiError from './utils/ApiError';
import admin from './services/admin.service';
import httpStatus from 'http-status';
import cors from 'cors';
import { errorConverter, errorHandler } from './middleware/error';
import { redisRateLimit, logger, initDb } from 'common';
import passport from './services/oauth.service';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const app = express();
const port = process.env.PORT || 3000;

dotEnv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(redisRateLimit());

// Initialize Passport
app.use(passport.initialize());

// Setup Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Giga Main Service API',
      version: '1.0.0',
      description: 'Core user management, authentication, OAuth, file upload, and email services',
      contact: {
        name: 'Giga Backend Team',
        email: 'support@giga-backend.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Development server'
      }
    ],
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
  apis: [
    './src/routes/**/*.ts',
    './src/docs/**/*.ts',
    './src/swagger/**/*.ts'
  ]
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

initDb();
app.use(router);
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

mongoose.connect(process.env.MONGODB_URL || 'mongodb://mongo:27017/giga').catch((e) => {
  logger.error(e.message);
});

mongoose.connection.on('open', () => {
  logger.info('Mongoose Connection');
});

admin.createAdmin({
  email: 'default@default.com',
  password: 'defaultPass'
});

app.use(errorConverter);
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`giga-main-api running on ${port}`);
});

export default app;
