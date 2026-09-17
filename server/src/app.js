import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import healthRoutes from './routes/healthRoutes.js';
import opportunityRoutes from './routes/opportunityRoutes.js';
import marketRoutes from './routes/marketRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';

const app = express();

app.use(cors({ origin: env.clientUrl }));
app.use(express.json());

app.get('/', (_request, response) => {
  response.json({ name: 'VisualDisplay API', version: '1.0.0' });
});

app.use('/api/health', healthRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/catalog', catalogRoutes);

app.use((_request, response) => {
  response.status(404).json({ message: 'Route not found' });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    message: env.nodeEnv === 'production' ? 'Internal server error' : error.message
  });
});

export default app;
