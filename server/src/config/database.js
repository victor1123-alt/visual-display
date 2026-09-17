import { Sequelize } from './sequelize.js';
import { env } from './env.js';

export const sequelize = new Sequelize(
  env.database.name,
  env.database.user,
  env.database.password,
  {
    host: env.database.host,
    port: env.database.port,
    dialect: 'mysql',
    logging: false
  }
);
