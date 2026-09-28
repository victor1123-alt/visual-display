import { DataTypes, Model } from '../config/sequelize.js';

export class User extends Model {
  toSafeJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt
    };
  }
}

export function initUser(sequelize) {
  User.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(191), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('member', 'admin'), allowNull: false, defaultValue: 'member' }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withPassword: { attributes: { include: ['passwordHash'] } } }
  });
  return User;
}
