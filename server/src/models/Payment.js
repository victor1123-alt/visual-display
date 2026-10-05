import { DataTypes, Model } from '../config/sequelize.js';

export class Payment extends Model {}

export function initPayment(sequelize) {
  Payment.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    reference: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    amountMinor: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'NGN' },
    status: { type: DataTypes.ENUM('pending', 'success', 'failed', 'review'), allowNull: false, defaultValue: 'pending' },
    checkoutUrl: { type: DataTypes.TEXT, allowNull: true },
    paidAt: { type: DataTypes.DATE, allowNull: true }
  }, { sequelize, modelName: 'Payment', tableName: 'payments', underscored: true });
  return Payment;
}
