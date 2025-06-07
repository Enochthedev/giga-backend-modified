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

rabbit.GetRideOffer();
rabbit.getClosestDrivers();
app.use(errorConverter);
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`taxi driver listening on ${port}`);
});

export default app;
