import express from 'express';
import mongoose from 'mongoose';
import * as dotEnv from 'dotenv';
import ApiError from './utils/ApiError';
import httpStatus from 'http-status';
import router from './routes/routesConfig';
import cors from 'cors';
import { errorConverter, errorHandler } from './middleware/error';
import rabbit from './rabbitMq/rabbitmq.services';
import { redisRateLimit, logger, setupSwagger, initDb } from 'common';

const app = express();
const port = process.env.PORT || 3001;

dotEnv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(redisRateLimit());
setupSwagger(app, 'Taxi Main Service');
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

rabbit.DriverEndTrip();
app.use(errorConverter);
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`taxi main listening on ${port}`);
});

export default app;
