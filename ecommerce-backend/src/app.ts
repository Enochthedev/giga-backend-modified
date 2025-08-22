import express from 'express';
import ordersRouter from './routes/orders';

const app = express();
app.use(express.json());
const port = process.env.PORT || 4000;

// Simple middleware for now
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req, res) => res.status(200).send('ok'));
app.use('/', ordersRouter);

app.listen(port, () => { 
  console.log(`ecommerce-backend listening on ${port}`); 
});

export default app;
