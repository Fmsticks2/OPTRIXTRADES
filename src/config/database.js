require('dotenv').config();
const { Sequelize } = require('sequelize');
const { logger } = require('../utils/logger');

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  // Add SSL configuration for production environments (like Render)
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false // Important for connecting to Render PostgreSQL
    }
  } : {},
  // Add retry logic for connection issues
  retry: {
    max: 5,
    timeout: 60000 // 60 seconds
  }
};

// Log database connection information (without sensitive data)
logger.info(`Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    dialectOptions: dbConfig.dialectOptions,
    retry: dbConfig.retry
  }
);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    return true;
  } catch (error) {
    logger.error('Unable to connect to the database:', error.message);
    logger.error('Database connection details (host/port):', `${dbConfig.host}:${dbConfig.port}`);
    
    // Additional troubleshooting information
    if (error.name === 'SequelizeHostNotFoundError') {
      logger.error('Host not found error. Please check if the DB_HOST value is correct and the database is accessible from your application.');
    } else if (error.name === 'SequelizeConnectionRefusedError') {
      logger.error('Connection refused. Please check if the database server is running and accessible.');
    } else if (error.name === 'SequelizeConnectionError') {
      logger.error('Connection error. Please check your database credentials and network connectivity.');
    }
    
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection
};