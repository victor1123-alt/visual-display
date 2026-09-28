import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import healthRoutes from './routes/healthRoutes.js';
import opportunityRoutes from './routes/opportunityRoutes.js';
import marketRoutes from './routes/marketRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import authRoutes from './routes/authRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';

const app = express();
const clientDistPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
const hasClientBuild = existsSync(path.join(clientDistPath, 'index.html'));

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '32kb' }));

if (hasClientBuild) {
  app.use(express.static(clientDistPath));
}

app.get('/', (_request, response) => {
  response.json({ name: 'VisualDisplay API', version: '1.0.0' });
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/catalog', catalogRoutes);

if (hasClientBuild) {
  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api')) return next();
    return response.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

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
