/**
 * Base Service for OPTRIXTRADES
 * Provides common CRUD operations and error handling for all services
 */

const { logger } = require('../utils/logger');
const { handleError, DatabaseError, NotFoundError } = require('../utils/errorHandler');
const cacheService = require('./cacheService');

/**
 * Base service class with common CRUD operations
 */
class BaseService {
  /**
   * Constructor for BaseService
   * @param {Object} model - Sequelize model
   * @param {string} modelName - Name of the model for logging and error messages
   * @param {string} cachePrefix - Cache key prefix for this model
   * @param {number} cacheTTL - Cache TTL in seconds
   */
  constructor(model, modelName, cachePrefix = null, cacheTTL = 3600) {
    this.model = model;
    this.modelName = modelName;
    this.cachePrefix = cachePrefix;
    this.cacheTTL = cacheTTL;
  }

  /**
   * Generate cache key for an entity
   * @param {string|number} id - Entity ID
   * @returns {string} - Cache key
   */
  getCacheKey(id) {
    return this.cachePrefix ? `${this.cachePrefix}:${id}` : null;
  }

  /**
   * Create a new entity
   * @param {Object} data - Entity data
   * @returns {Promise<Object>} - Created entity
   */
  async create(data) {
    try {
      const entity = await this.model.create(data);
      
      // Cache the entity if caching is enabled
      if (this.cachePrefix) {
        await cacheService.set(
          this.getCacheKey(entity.id),
          entity.toJSON(),
          this.cacheTTL
        );
      }
      
      logger.info(`${this.modelName} created with ID: ${entity.id}`);
      return entity;
    } catch (error) {
      logger.error(`Error creating ${this.modelName}:`, error);
      throw new DatabaseError(`Failed to create ${this.modelName}`, { error: error.message });
    }
  }

  /**
   * Find entity by ID
   * @param {string|number} id - Entity ID
   * @param {Object} options - Additional options (e.g., include)
   * @returns {Promise<Object>} - Found entity
   */
  async findById(id, options = {}) {
    try {
      // Try to get from cache first
      if (this.cachePrefix) {
        const cachedEntity = await cacheService.get(this.getCacheKey(id));
        if (cachedEntity) {
          return cachedEntity;
        }
      }
      
      // If not in cache or caching disabled, get from database
      const entity = await this.model.findByPk(id, options);
      
      if (!entity) {
        throw new NotFoundError(`${this.modelName} with ID ${id} not found`);
      }
      
      // Cache the entity if caching is enabled
      if (this.cachePrefix) {
        await cacheService.set(
          this.getCacheKey(id),
          entity.toJSON(),
          this.cacheTTL
        );
      }
      
      return entity;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error(`Error finding ${this.modelName} by ID ${id}:`, error);
      throw new DatabaseError(`Failed to find ${this.modelName}`, { error: error.message });
    }
  }

  /**
   * Find all entities matching criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Additional options (e.g., include, order)
   * @returns {Promise<Array>} - Found entities
   */
  async findAll(criteria = {}, options = {}) {
    try {
      const entities = await this.model.findAll({
        where: criteria,
        ...options
      });
      
      return entities;
    } catch (error) {
      logger.error(`Error finding ${this.modelName} entities:`, error);
      throw new DatabaseError(`Failed to find ${this.modelName} entities`, { error: error.message });
    }
  }

  /**
   * Update entity by ID
   * @param {string|number} id - Entity ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} - Updated entity
   */
  async update(id, data) {
    try {
      const entity = await this.findById(id);
      
      await entity.update(data);
      
      // Update cache if caching is enabled
      if (this.cachePrefix) {
        await cacheService.set(
          this.getCacheKey(id),
          entity.toJSON(),
          this.cacheTTL
        );
      }
      
      logger.info(`${this.modelName} with ID ${id} updated`);
      return entity;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error(`Error updating ${this.modelName} with ID ${id}:`, error);
      throw new DatabaseError(`Failed to update ${this.modelName}`, { error: error.message });
    }
  }

  /**
   * Delete entity by ID
   * @param {string|number} id - Entity ID
   * @returns {Promise<boolean>} - Success status
   */
  async delete(id) {
    try {
      const entity = await this.findById(id);
      
      await entity.destroy();
      
      // Remove from cache if caching is enabled
      if (this.cachePrefix) {
        await cacheService.del(this.getCacheKey(id));
      }
      
      logger.info(`${this.modelName} with ID ${id} deleted`);
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error(`Error deleting ${this.modelName} with ID ${id}:`, error);
      throw new DatabaseError(`Failed to delete ${this.modelName}`, { error: error.message });
    }
  }

  /**
   * Count entities matching criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<number>} - Count of matching entities
   */
  async count(criteria = {}) {
    try {
      return await this.model.count({ where: criteria });
    } catch (error) {
      logger.error(`Error counting ${this.modelName} entities:`, error);
      throw new DatabaseError(`Failed to count ${this.modelName} entities`, { error: error.message });
    }
  }

  /**
   * Find or create entity
   * @param {Object} criteria - Search criteria
   * @param {Object} defaults - Default values for creation
   * @returns {Promise<Array>} - [entity, created]
   */
  async findOrCreate(criteria, defaults = {}) {
    try {
      const [entity, created] = await this.model.findOrCreate({
        where: criteria,
        defaults
      });
      
      // Cache the entity if caching is enabled and entity was created
      if (this.cachePrefix && created) {
        await cacheService.set(
          this.getCacheKey(entity.id),
          entity.toJSON(),
          this.cacheTTL
        );
      }
      
      if (created) {
        logger.info(`${this.modelName} created with ID: ${entity.id}`);
      }
      
      return [entity, created];
    } catch (error) {
      logger.error(`Error in findOrCreate for ${this.modelName}:`, error);
      throw new DatabaseError(`Failed in findOrCreate for ${this.modelName}`, { error: error.message });
    }
  }

  /**
   * Invalidate cache for an entity
   * @param {string|number} id - Entity ID
   * @returns {Promise<boolean>} - Success status
   */
  async invalidateCache(id) {
    if (!this.cachePrefix) return true;
    
    try {
      await cacheService.del(this.getCacheKey(id));
      return true;
    } catch (error) {
      logger.error(`Error invalidating cache for ${this.modelName} with ID ${id}:`, error);
      return false;
    }
  }
}

module.exports = BaseService;