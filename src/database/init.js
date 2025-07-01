const { sequelize } = require('../config/database');
const { User, Verification, FollowUp, Trading } = require('../models');

/**
 * Initialize database by syncing all models
 */
const initDatabase = async () => {
  try {
    // Force: true will drop the table if it already exists (use with caution)
    // For production, set force to false
    const force = process.env.NODE_ENV === 'development' && process.env.DB_FORCE_SYNC === 'true';
    
    console.log(`Syncing database with force: ${force}`);
    
    // Sync all models
    await sequelize.sync({ force });
    
    console.log('Database synchronized successfully');
    return true;
  } catch (error) {
    console.error('Error synchronizing database:', error);
    return false;
  }
};

module.exports = {
  initDatabase
};