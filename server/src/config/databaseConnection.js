import { sequelize } from './database.js';
import { env } from './env.js';

export async function connectDatabase() {
  await sequelize.authenticate();
  console.log('Database connection established');
}

export async function initializeDatabase() {
  if (!env.dbSync) return;
  await sequelize.sync();
  console.log('Database tables synchronized');
}

export async function closeDatabase() {
  await sequelize.close();
  console.log('Database connection closed');
}
