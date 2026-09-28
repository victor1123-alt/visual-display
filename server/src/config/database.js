import { Sequelize } from './sequelize.js';
import { env } from './env.js';

const options = {
  dialect: 'mysql',
  logging: false,
  dialectOptions: env.nodeEnv === 'production' ? { connectTimeout: 20000 } : undefined,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
};

export const sequelize = env.database.url
  ? new Sequelize(env.database.url, options)
  : new Sequelize(env.database.name, env.database.user, env.database.password, {
    ...options,
    host: env.database.host,
    port: env.database.port
  });
