/**
 * Database Utilities for OPTRIXTRADES
 * Provides utilities for database operations and query optimization
 */

const { Sequelize, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logger } = require('./logger');
const { DatabaseError } = require('./errorHandler');

/**
 * Execute a database transaction
 * @param {Function} callback - Function to execute within transaction
 * @returns {Promise<*>} - Result of the callback function
 */
const withTransaction = async (callback) => {
  const transaction = await sequelize.transaction();
  
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    logger.error('Transaction error:', error);
    throw new DatabaseError('Database transaction failed', { error: error.message });
  }
};

/**
 * Create pagination parameters for queries
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Number of items per page
 * @returns {Object} - Pagination parameters for Sequelize
 */
const getPaginationParams = (page = 1, pageSize = 10) => {
  const limit = Math.max(1, Math.min(100, parseInt(pageSize, 10)));
  const offset = Math.max(0, (parseInt(page, 10) - 1)) * limit;
  
  return { limit, offset };
};

/**
 * Create a paginated response
 * @param {Array} items - Items for the current page
 * @param {number} totalItems - Total number of items
 * @param {number} page - Current page number
 * @param {number} pageSize - Number of items per page
 * @returns {Object} - Paginated response
 */
const createPaginatedResponse = (items, totalItems, page, pageSize) => {
  const limit = parseInt(pageSize, 10);
  const currentPage = parseInt(page, 10);
  const totalPages = Math.ceil(totalItems / limit);
  
  return {
    items,
    pagination: {
      totalItems,
      totalPages,
      currentPage,
      pageSize: limit,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    }
  };
};

/**
 * Execute a paginated query
 * @param {Object} model - Sequelize model
 * @param {Object} options - Query options
 * @param {number} page - Page number
 * @param {number} pageSize - Number of items per page
 * @returns {Promise<Object>} - Paginated response
 */
const paginatedQuery = async (model, options = {}, page = 1, pageSize = 10) => {
  try {
    const pagination = getPaginationParams(page, pageSize);
    
    // Execute count query
    const count = await model.count({
      where: options.where,
      include: options.include,
      distinct: true
    });
    
    // Execute find query with pagination
    const items = await model.findAll({
      ...options,
      ...pagination
    });
    
    return createPaginatedResponse(items, count, page, pageSize);
  } catch (error) {
    logger.error('Paginated query error:', error);
    throw new DatabaseError('Failed to execute paginated query', { error: error.message });
  }
};

/**
 * Create date range condition for queries
 * @param {string} field - Field name
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Object} - Date range condition for Sequelize
 */
const dateRangeCondition = (field, startDate, endDate) => {
  const condition = {};
  
  if (startDate) {
    condition[Op.gte] = new Date(startDate);
  }
  
  if (endDate) {
    condition[Op.lte] = new Date(endDate);
  }
  
  return { [field]: condition };
};

/**
 * Create search condition for text fields
 * @param {Array<string>} fields - Field names to search in
 * @param {string} searchTerm - Search term
 * @returns {Object} - Search condition for Sequelize
 */
const searchCondition = (fields, searchTerm) => {
  if (!searchTerm || !fields.length) {
    return {};
  }
  
  return {
    [Op.or]: fields.map(field => ({
      [field]: { [Op.iLike]: `%${searchTerm}%` }
    }))
  };
};

/**
 * Execute a raw SQL query
 * @param {string} sql - SQL query
 * @param {Object} replacements - Query replacements
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Query results
 */
const executeRawQuery = async (sql, replacements = {}, options = {}) => {
  try {
    const [results] = await sequelize.query(sql, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
      ...options
    });
    
    return results;
  } catch (error) {
    logger.error('Raw query error:', error);
    throw new DatabaseError('Failed to execute raw query', { error: error.message });
  }
};

/**
 * Get database statistics
 * @returns {Promise<Object>} - Database statistics
 */
const getDatabaseStats = async () => {
  try {
    // Get table sizes
    const tableSizes = await executeRawQuery(`
      SELECT
        table_name,
        pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as total_size,
        pg_size_pretty(pg_relation_size(quote_ident(table_name))) as table_size,
        pg_size_pretty(pg_total_relation_size(quote_ident(table_name)) - pg_relation_size(quote_ident(table_name))) as index_size
      FROM
        information_schema.tables
      WHERE
        table_schema = 'public'
      ORDER BY
        pg_total_relation_size(quote_ident(table_name)) DESC
    `);
    
    // Get row counts for main tables
    const [userCount] = await sequelize.query('SELECT COUNT(*) FROM users');
    const [verificationCount] = await sequelize.query('SELECT COUNT(*) FROM verifications');
    const [tradingCount] = await sequelize.query('SELECT COUNT(*) FROM trading_signals');
    
    return {
      tableSizes,
      rowCounts: {
        users: userCount[0].count,
        verifications: verificationCount[0].count,
        tradingSignals: tradingCount[0].count
      }
    };
  } catch (error) {
    logger.error('Database stats error:', error);
    throw new DatabaseError('Failed to get database statistics', { error: error.message });
  }
};

module.exports = {
  withTransaction,
  getPaginationParams,
  createPaginatedResponse,
  paginatedQuery,
  dateRangeCondition,
  searchCondition,
  executeRawQuery,
  getDatabaseStats
};