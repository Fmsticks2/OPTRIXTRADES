const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  telegram_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  registration_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  broker_uid: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verification_status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  subscription_tier: {
    type: DataTypes.ENUM('free', 'basic', 'premium', 'vip'),
    allowNull: false,
    defaultValue: 'free'
  },
  deposit_amount: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  auto_trade_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  last_interaction: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  risk_per_trade: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 2.0 // Default 2% risk per trade
  },
  max_trade_amount: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  in_premium_channel: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  in_vip_channel: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  follow_up_sequence_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  follow_up_sequence_day: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

module.exports = User;