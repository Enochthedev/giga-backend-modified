import express from 'express';
import mongoose from 'mongoose';
import * as dotEnv from 'dotenv';
import router from './routes/routesConfig';
import ApiError from './utils/ApiError';
import admin from './services/admin.service';
import httpStatus from 'http-status';
import cors from 'cors';
import { errorConverter, errorHandler } from './middleware/error';
import { redisRateLimit, logger, setupSwagger, initDb } from 'common';

const app = express();
const port = process.env.PORT || 3000;

dotEnv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(redisRateLimit());
setupSwagger(app, 'User Service');
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
