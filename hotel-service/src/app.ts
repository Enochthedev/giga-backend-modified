import express from 'express';
import { redisRateLimit, logger, setupSwagger, initDb } from 'common';
import bookingsRouter from './routes/bookings';

const app = express();
app.use(express.json());
const port = process.env.PORT || 4000;

app.use(redisRateLimit());
setupSwagger(app, 'Hotel Service');
initDb();

app.get('/health', (_req, res) => res.status(200).send('ok'));
app.use('/', bookingsRouter);

app.listen(port, () => { logger.info(`hotel-service listening on ${port}`); });
export default app;
