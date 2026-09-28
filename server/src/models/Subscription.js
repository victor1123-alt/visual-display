import { DataTypes, Model } from '../config/sequelize.js';

export class Subscription extends Model {
  isActive(at = new Date()) {
    return this.status === 'active'
      && (!this.startsAt || this.startsAt <= at)
      && (!this.endsAt || this.endsAt > at);
  }
}

export function initSubscription(sequelize) {
  Subscription.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
    plan: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'pro-monthly' },
    status: { type: DataTypes.ENUM('pending', 'active', 'canceled', 'expired'), allowNull: false, defaultValue: 'pending' },
    requestedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    startsAt: { type: DataTypes.DATE, allowNull: true },
    endsAt: { type: DataTypes.DATE, allowNull: true },
    provider: { type: DataTypes.STRING(40), allowNull: true },
    providerReference: { type: DataTypes.STRING(191), allowNull: true }
  }, { sequelize, modelName: 'Subscription', tableName: 'subscriptions', underscored: true });
  return Subscription;
}
