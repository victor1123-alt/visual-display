import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const { DataTypes, Model, Sequelize } = require('sequelize');
