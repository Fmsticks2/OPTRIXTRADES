const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const FollowUp = sequelize.define('FollowUp', {
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
  sequence_day: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  scheduled_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  sent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  sent_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  message_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_response: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  user_response_time: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'follow_ups',
  timestamps: true,
  underscored: true
});

// Define association
FollowUp.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(FollowUp, { foreignKey: 'user_id' });

module.exports = FollowUp;