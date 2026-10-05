import { sequelize } from './database.js';
import { env } from './env.js';

export async function connectDatabase() {
  await sequelize.authenticate();
  console.log('Database connection established');
}

export async function initializeDatabase() {
  await sequelize.models.User.sync();
  await sequelize.models.Subscription.sync();
  await sequelize.models.Payment.sync();
  console.log('Authentication tables ready');
  if (env.dbSync) {
    await sequelize.sync();
    console.log('All database tables synchronized');
  }
}

export async function closeDatabase() {
  await sequelize.close();
  console.log('Database connection closed');
}
