import { DataTypes, Model } from '../config/sequelize.js';

export class Market extends Model {}

export function initMarket(sequelize) {
  Market.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    eventId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'event_id' },
    marketKey: { type: DataTypes.STRING(100), allowNull: false, field: 'market_key' },
    name: { type: DataTypes.STRING(120), allowNull: false },
    outcomes: { type: DataTypes.JSON, allowNull: false }
  }, { sequelize, modelName: 'Market', tableName: 'markets', underscored: true, indexes: [{ unique: true, fields: ['event_id', 'market_key'] }] });
  return Market;
}
