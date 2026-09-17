import app from './app.js';
import { env } from './config/env.js';
import { createMarketWebSocketServer, startMarketSync } from './services/marketSyncService.js';
import { createServer } from 'node:http';

async function startServer() {
  if (env.dbEnabled) {
    const { connectDatabase, initializeDatabase } = await import('./config/databaseConnection.js');
    await import('./models/index.js');
    await connectDatabase();
    await initializeDatabase();
  }

  const httpServer = createServer(app);
  const webSocketServer = createMarketWebSocketServer(httpServer);
  const stopMarketSync = startMarketSync(webSocketServer);
  httpServer.listen(env.port, () => {
    console.log(`VisualDisplay API listening on port ${env.port}`);
    console.log('Market WebSocket listening at /ws/markets');
    console.log(`Market sync interval: ${env.syncIntervalMs}ms`);
    console.log(`Storage: ${env.dbEnabled ? 'MySQL via Sequelize' : 'in-memory snapshot'}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down gracefully`);
    stopMarketSync();
    webSocketServer.close();
    httpServer.close(async () => {
      if (env.dbEnabled) {
        const { closeDatabase } = await import('./config/databaseConnection.js');
        await closeDatabase();
      }
      process.exit(0);
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((error) => {
  console.error('Unable to start VisualDisplay API', error);
  process.exitCode = 1;
});
