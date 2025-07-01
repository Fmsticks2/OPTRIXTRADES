const { User, Trading, FollowUp } = require('../models');
const { Sequelize, Op } = require('sequelize');
const { logger, logError } = require('../utils/logger');

/**
 * Get user registration statistics
 * @param {Object} options - Query options
 * @param {Date} options.startDate - Start date
 * @param {Date} options.endDate - End date
 * @returns {Promise<Object>} - Registration statistics
 */
const getUserRegistrationStats = async (options = {}) => {
  try {
    const { startDate, endDate } = options;
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereClause.created_at = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      whereClause.created_at = {
        [Op.lte]: endDate
      };
    }
    
    // Total registrations
    const totalRegistrations = await User.count({
      where: whereClause
    });
    
    // Registrations by day
    const registrationsByDay = await User.findAll({
      attributes: [
        [Sequelize.fn('date', Sequelize.col('created_at')), 'date'],
        [Sequelize.fn('count', Sequelize.col('id')), 'count']
      ],
      where: whereClause,
      group: [Sequelize.fn('date', Sequelize.col('created_at'))],
      order: [[Sequelize.fn('date', Sequelize.col('created_at')), 'ASC']]
    });
    
    // Verification statistics
    const verificationStats = await getVerificationStats(whereClause);
    
    return {
      totalRegistrations,
      registrationsByDay: registrationsByDay.map(item => ({
        date: item.getDataValue('date'),
        count: parseInt(item.getDataValue('count'))
      })),
      verificationStats
    };
  } catch (error) {
    logError('system', 'getUserRegistrationStats', error);
    throw error;
  }
};

/**
 * Get verification statistics
 * @param {Object} whereClause - Additional where conditions
 * @returns {Promise<Object>} - Verification statistics
 */
const getVerificationStats = async (whereClause = {}) => {
  try {
    // Total verified users
    const totalVerified = await User.count({
      where: {
        ...whereClause,
        verification_status: 'verified'
      }
    });
    
    // Total pending verifications
    const totalPending = await User.count({
      where: {
        ...whereClause,
        verification_status: 'pending'
      }
    });
    
    // Total rejected verifications
    const totalRejected = await User.count({
      where: {
        ...whereClause,
        verification_status: 'rejected'
      }
    });
    
    // Verification rate
    const totalUsers = await User.count({ where: whereClause });
    const verificationRate = totalUsers > 0 ? (totalVerified / totalUsers) * 100 : 0;
    
    // Premium tier distribution
    const premiumUsers = await User.count({
      where: {
        ...whereClause,
        verification_status: 'verified',
        subscription_tier: 'premium'
      }
    });
    
    const vipUsers = await User.count({
      where: {
        ...whereClause,
        verification_status: 'verified',
        subscription_tier: 'vip'
      }
    });
    
    return {
      totalVerified,
      totalPending,
      totalRejected,
      verificationRate: verificationRate.toFixed(2),
      tierDistribution: {
        premium: premiumUsers,
        vip: vipUsers
      }
    };
  } catch (error) {
    logError('system', 'getVerificationStats', error);
    throw error;
  }
};

/**
 * Get follow-up sequence statistics
 * @param {Object} options - Query options
 * @param {Date} options.startDate - Start date
 * @param {Date} options.endDate - End date
 * @returns {Promise<Object>} - Follow-up statistics
 */
const getFollowUpStats = async (options = {}) => {
  try {
    const { startDate, endDate } = options;
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.scheduled_time = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereClause.scheduled_time = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      whereClause.scheduled_time = {
        [Op.lte]: endDate
      };
    }
    
    // Total follow-ups sent
    const totalSent = await FollowUp.count({
      where: {
        ...whereClause,
        sent: true
      }
    });
    
    // Follow-ups by sequence day
    const followUpsByDay = await FollowUp.findAll({
      attributes: [
        'sequence_day',
        [Sequelize.fn('count', Sequelize.col('id')), 'count']
      ],
      where: {
        ...whereClause,
        sent: true
      },
      group: ['sequence_day'],
      order: [['sequence_day', 'ASC']]
    });
    
    // Response rate by sequence day
    const responseRateByDay = await FollowUp.findAll({
      attributes: [
        'sequence_day',
        [Sequelize.fn('count', Sequelize.col('id')), 'total'],
        [Sequelize.fn('sum', Sequelize.literal('CASE WHEN user_response IS NOT NULL THEN 1 ELSE 0 END')), 'responded']
      ],
      where: {
        ...whereClause,
        sent: true
      },
      group: ['sequence_day'],
      order: [['sequence_day', 'ASC']]
    });
    
    // Conversion rate (users who verified after follow-up)
    const conversionStats = await getFollowUpConversionStats(whereClause);
    
    return {
      totalSent,
      followUpsByDay: followUpsByDay.map(item => ({
        day: item.sequence_day,
        count: parseInt(item.getDataValue('count'))
      })),
      responseRateByDay: responseRateByDay.map(item => ({
        day: item.sequence_day,
        total: parseInt(item.getDataValue('total')),
        responded: parseInt(item.getDataValue('responded')),
        rate: item.getDataValue('total') > 0 ? 
          (parseInt(item.getDataValue('responded')) / parseInt(item.getDataValue('total'))) * 100 : 0
      })),
      conversionStats
    };
  } catch (error) {
    logError('system', 'getFollowUpStats', error);
    throw error;
  }
};

/**
 * Get follow-up conversion statistics
 * @param {Object} whereClause - Additional where conditions
 * @returns {Promise<Object>} - Conversion statistics
 */
const getFollowUpConversionStats = async (whereClause = {}) => {
  try {
    // This is a complex query that would typically use raw SQL or complex ORM operations
    // For simplicity, we'll use a placeholder implementation
    // In a real implementation, you would track which users verified after receiving a follow-up
    
    // Placeholder data
    return {
      totalConversions: 0,
      conversionRate: 0,
      conversionsByDay: []
    };
  } catch (error) {
    logError('system', 'getFollowUpConversionStats', error);
    throw error;
  }
};

/**
 * Get trading statistics
 * @param {Object} options - Query options
 * @param {Date} options.startDate - Start date
 * @param {Date} options.endDate - End date
 * @returns {Promise<Object>} - Trading statistics
 */
const getTradingStats = async (options = {}) => {
  try {
    const { startDate, endDate } = options;
    const whereClause = {
      user_id: null // System signals only
    };
    
    if (startDate && endDate) {
      whereClause.entry_time = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereClause.entry_time = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      whereClause.entry_time = {
        [Op.lte]: endDate
      };
    }
    
    // Total signals
    const totalSignals = await Trading.count({
      where: whereClause
    });
    
    // Closed signals
    const closedSignals = await Trading.count({
      where: {
        ...whereClause,
        status: 'closed'
      }
    });
    
    // Profitable signals
    const profitableSignals = await Trading.count({
      where: {
        ...whereClause,
        status: 'closed',
        profit_loss: { [Op.gt]: 0 }
      }
    });
    
    // Win rate
    const winRate = closedSignals > 0 ? (profitableSignals / closedSignals) * 100 : 0;
    
    // Average profit/loss
    const avgProfitLoss = await Trading.findOne({
      attributes: [
        [Sequelize.fn('avg', Sequelize.col('profit_loss')), 'avg_profit_loss']
      ],
      where: {
        ...whereClause,
        status: 'closed'
      }
    });
    
    // Signals by asset
    const signalsByAsset = await Trading.findAll({
      attributes: [
        'asset',
        [Sequelize.fn('count', Sequelize.col('id')), 'count']
      ],
      where: whereClause,
      group: ['asset'],
      order: [[Sequelize.fn('count', Sequelize.col('id')), 'DESC']]
    });
    
    // Auto-trading statistics
    const autoTradingStats = await getAutoTradingStats(whereClause);
    
    return {
      totalSignals,
      closedSignals,
      profitableSignals,
      winRate: winRate.toFixed(2),
      avgProfitLoss: avgProfitLoss ? parseFloat(avgProfitLoss.getDataValue('avg_profit_loss')).toFixed(2) : 0,
      signalsByAsset: signalsByAsset.map(item => ({
        asset: item.asset,
        count: parseInt(item.getDataValue('count'))
      })),
      autoTradingStats
    };
  } catch (error) {
    logError('system', 'getTradingStats', error);
    throw error;
  }
};

/**
 * Get auto-trading statistics
 * @param {Object} whereClause - Additional where conditions
 * @returns {Promise<Object>} - Auto-trading statistics
 */
const getAutoTradingStats = async (whereClause = {}) => {
  try {
    // Total auto-trades
    const totalAutoTrades = await Trading.count({
      where: {
        ...whereClause,
        auto_traded: true
      }
    });
    
    // Users with auto-trading enabled
    const usersWithAutoTrading = await User.count({
      where: {
        verification_status: 'verified',
        subscription_tier: 'vip',
        auto_trade_enabled: true
      }
    });
    
    // Average auto-trade amount
    const avgAutoTradeAmount = await User.findOne({
      attributes: [
        [Sequelize.fn('avg', Sequelize.col('auto_trade_amount')), 'avg_amount']
      ],
      where: {
        verification_status: 'verified',
        subscription_tier: 'vip',
        auto_trade_enabled: true,
        auto_trade_amount: { [Op.not]: null }
      }
    });
    
    return {
      totalAutoTrades,
      usersWithAutoTrading,
      avgAutoTradeAmount: avgAutoTradeAmount ? 
        parseFloat(avgAutoTradeAmount.getDataValue('avg_amount')).toFixed(2) : 0
    };
  } catch (error) {
    logError('system', 'getAutoTradingStats', error);
    throw error;
  }
};

/**
 * Get user retention statistics
 * @param {Object} options - Query options
 * @param {Date} options.startDate - Start date
 * @param {Date} options.endDate - End date
 * @returns {Promise<Object>} - Retention statistics
 */
const getUserRetentionStats = async (options = {}) => {
  try {
    // This would typically involve complex queries to track user activity over time
    // For simplicity, we'll use a placeholder implementation
    
    // Placeholder data
    return {
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      monthlyActiveUsers: 0,
      retentionByDay: []
    };
  } catch (error) {
    logError('system', 'getUserRetentionStats', error);
    throw error;
  }
};

/**
 * Generate analytics report
 * @param {Object} options - Report options
 * @param {string} options.reportType - Report type (daily, weekly, monthly)
 * @param {Date} options.startDate - Start date
 * @param {Date} options.endDate - End date
 * @returns {Promise<Object>} - Analytics report
 */
const generateAnalyticsReport = async (options = {}) => {
  try {
    const { reportType = 'daily', startDate, endDate } = options;
    
    // Set date range based on report type if not provided
    let reportStartDate = startDate;
    let reportEndDate = endDate;
    
    if (!reportStartDate || !reportEndDate) {
      const now = new Date();
      reportEndDate = new Date(now);
      
      if (reportType === 'daily') {
        reportStartDate = new Date(now.setDate(now.getDate() - 1));
      } else if (reportType === 'weekly') {
        reportStartDate = new Date(now.setDate(now.getDate() - 7));
      } else if (reportType === 'monthly') {
        reportStartDate = new Date(now.setMonth(now.getMonth() - 1));
      }
    }
    
    // Gather all statistics
    const [registrationStats, followUpStats, tradingStats, retentionStats] = await Promise.all([
      getUserRegistrationStats({ startDate: reportStartDate, endDate: reportEndDate }),
      getFollowUpStats({ startDate: reportStartDate, endDate: reportEndDate }),
      getTradingStats({ startDate: reportStartDate, endDate: reportEndDate }),
      getUserRetentionStats({ startDate: reportStartDate, endDate: reportEndDate })
    ]);
    
    return {
      reportType,
      startDate: reportStartDate,
      endDate: reportEndDate,
      generatedAt: new Date(),
      registrationStats,
      followUpStats,
      tradingStats,
      retentionStats
    };
  } catch (error) {
    logError('system', 'generateAnalyticsReport', error);
    throw error;
  }
};

module.exports = {
  getUserRegistrationStats,
  getVerificationStats,
  getFollowUpStats,
  getTradingStats,
  getUserRetentionStats,
  generateAnalyticsReport
};