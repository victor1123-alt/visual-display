import { DataTypes, Model } from '../config/sequelize.js';

export class Event extends Model {}

export function initEvent(sequelize) {
  Event.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    sportId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'sport_id' },
    externalId: { type: DataTypes.STRING(150), allowNull: false, field: 'external_id' },
    homeTeam: { type: DataTypes.STRING(150), allowNull: false, field: 'home_team' },
    awayTeam: { type: DataTypes.STRING(150), allowNull: false, field: 'away_team' },
    startsAt: { type: DataTypes.DATE, allowNull: false, field: 'starts_at' },
    status: { type: DataTypes.ENUM('scheduled', 'live', 'finished', 'cancelled'), allowNull: false, defaultValue: 'scheduled' }
  }, { sequelize, modelName: 'Event', tableName: 'events', underscored: true, indexes: [{ unique: true, fields: ['sport_id', 'external_id'] }] });
  return Event;
}
