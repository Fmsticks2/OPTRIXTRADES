const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Trading = sequelize.define('Trading', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  signal_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  trade_type: {
    type: DataTypes.ENUM('BUY', 'SELL'),
    allowNull: false
  },
  asset: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entry_price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  exit_price: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  quantity: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  risk_percentage: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  trade_amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  profit_loss: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  profit_loss_percentage: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  tier: {
    type: DataTypes.ENUM('basic', 'premium', 'vip'),
    allowNull: false,
    defaultValue: 'premium'
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'CLOSED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'OPEN'
  },
  entry_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  exit_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  auto_traded: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'trading_history',
  timestamps: true,
  underscored: true
});

// Define association
Trading.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Trading, { foreignKey: 'user_id' });

module.exports = Trading;