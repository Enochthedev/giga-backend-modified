import express from 'express';
import { redisRateLimit, logger, setupSwagger, initDb } from 'common';
import payRouter from './routes/pay';

const app = express();
app.use(express.json());
const port = process.env.PORT || 4000;

app.use(redisRateLimit());
setupSwagger(app, 'Payment Service');
initDb();

app.get('/health', (_req, res) => res.status(200).send('ok'));
app.use('/', payRouter);

app.listen(port, () => { logger.info(`payment-service listening on ${port}`); });
export default app;
