import express from 'express';
import bookingsRouter from './routes/bookings';

const app = express();
app.use(express.json());
const port = process.env.PORT || 4001;

// Simple middleware for now
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req, res) => res.status(200).send('ok'));
app.use('/', bookingsRouter);

app.listen(port, () => { 
  console.log(`hotel-service listening on ${port}`); 
});

export default app;
