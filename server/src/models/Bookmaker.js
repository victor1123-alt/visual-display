import { DataTypes, Model } from '../config/sequelize.js';

export class Bookmaker extends Model {}

export function initBookmaker(sequelize) {
  Bookmaker.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    websiteUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'website_url' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' }
  }, { sequelize, modelName: 'Bookmaker', tableName: 'bookmakers', underscored: true });
  return Bookmaker;
}
