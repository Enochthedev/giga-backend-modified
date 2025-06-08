import express from 'express';
import { redisRateLimit, logger, setupSwagger, initDb } from 'common';
import adsRouter from './routes/ads';
import { initAdsTable } from './adsRepo';

const app = express();
app.use(express.json());
const port = process.env.PORT || 4000;

app.use(redisRateLimit());
setupSwagger(app, 'Advertisement Service');
initDb();
initAdsTable();

app.get('/health', (_req, res) => res.status(200).send('ok'));
app.use('/', adsRouter);

app.listen(port, () => { logger.info(`advertisement-service listening on ${port}`); });
export default app;
