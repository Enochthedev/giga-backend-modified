import express from 'express';
import mongoose from 'mongoose';
import * as dotEnv from 'dotenv';
import ApiError from './utils/ApiError';
import httpStatus from 'http-status';
import rabbit from './rabbitMq/rabbitmq.services';
import router from './routes/routesConfig';
import cors from 'cors';
import { errorConverter, errorHandler } from './middleware/error';
import { redisRateLimit, logger, setupSwagger, initDb } from 'common';

const app = express();
const port = process.env.PORT || 6000;

dotEnv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(redisRateLimit());
setupSwagger(app, 'Taxi Driver Service');
initDb();
app.use(router);
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

mongoose.connect(process.env.DB_HOST as string).catch((e) => {
  logger.error(e.message);
});

mongoose.connection.on('open', () => {
  logger.info('Mongoose Connection');
});

// Set up RabbitMQ consumers properly
// These will wait for messages instead of trying to process undefined data
setTimeout(() => {
  try {
    // Set up consumer for ride offers - this will wait for messages
    rabbit.consumeMessage('GetRideOffer', rabbit.GetRideOffer);
    // Set up consumer for finding closest drivers - this will wait for messages  
    rabbit.consumeMessage('GetClosestDrivers', rabbit.getClosestDrivers);
    logger.info('RabbitMQ consumers set up successfully');
  } catch (error) {
    logger.error('Error setting up RabbitMQ consumers:', error);
  }
}, 5000); // Wait 5 seconds for RabbitMQ to be ready

app.use(errorConverter);
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`taxi driver listening on ${port}`);
});

export default app;
