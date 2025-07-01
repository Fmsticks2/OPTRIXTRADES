const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Verification = sequelize.define('Verification', {
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
  uid_submitted: {
    type: DataTypes.STRING,
    allowNull: false
  },
  screenshot_url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  screenshot_s3_key: {
    type: DataTypes.STRING,
    allowNull: false
  },
  submission_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  admin_reviewed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  admin_reviewer_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  review_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approval_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  deposit_amount_confirmed: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
}, {
  tableName: 'verifications',
  timestamps: true,
  underscored: true
});

// Define association
Verification.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Verification, { foreignKey: 'user_id' });

module.exports = Verification;