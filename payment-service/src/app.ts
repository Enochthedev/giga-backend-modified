import express from 'express';
import payRouter from './routes/pay';

const app = express();
app.use(express.json());
const port = process.env.PORT || 4002;

// Simple middleware for now
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req, res) => res.status(200).send('ok'));
app.use('/', payRouter);

app.listen(port, () => { 
  console.log(`payment-service listening on ${port}`); 
});

export default app;
