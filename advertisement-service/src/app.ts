import express from 'express';
import adsRouter from './routes/ads';
import { initAdsTable } from './adsRepo';

const app = express();
app.use(express.json());
const port = process.env.PORT || 4003;

// Simple middleware for now
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

initAdsTable();

app.get('/health', (_req, res) => res.status(200).send('ok'));
app.use('/', adsRouter);

app.listen(port, () => { 
  console.log(`advertisement-service listening on ${port}`); 
});

export default app;
