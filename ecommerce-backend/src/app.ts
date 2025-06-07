import express from 'express';
import { redisRateLimit, logger, setupSwagger, initDb } from 'common';
import ordersRouter from './routes/orders';

const app = express();
app.use(express.json());
const port = process.env.PORT || 4000;

app.use(redisRateLimit());
setupSwagger(app, 'Ecommerce Service');
initDb();

app.get('/health', (_req, res) => res.status(200).send('ok'));
app.use('/', ordersRouter);

app.listen(port, () => { logger.info(`ecommerce-backend listening on ${port}`); });
export default app;
