import { DataTypes, Model } from '../config/sequelize.js';

export class Odd extends Model {}

export function initOdd(sequelize) {
  Odd.init({
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    marketId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'market_id' },
    bookmakerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'bookmaker_id' },
    outcome: { type: DataTypes.STRING(120), allowNull: false },
    value: { type: DataTypes.DECIMAL(8, 3), allowNull: false },
    capturedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'captured_at' },
    sourceUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'source_url' }
  }, { sequelize, modelName: 'Odd', tableName: 'odds', underscored: true, indexes: [{ fields: ['market_id', 'bookmaker_id', 'outcome'] }] });
  return Odd;
}
