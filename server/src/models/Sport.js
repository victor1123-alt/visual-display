import { DataTypes, Model } from '../config/sequelize.js';

export class Sport extends Model {}

export function initSport(sequelize) {
  Sport.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    slug: { type: DataTypes.STRING(80), allowNull: false, unique: true }
  }, { sequelize, modelName: 'Sport', tableName: 'sports', underscored: true });
  return Sport;
}
