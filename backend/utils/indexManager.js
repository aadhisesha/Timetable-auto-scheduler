const mongoose = require('mongoose');

/**
 * Safely drop indexes for a collection with proper error handling
 * @param {string} collectionName - Name of the collection
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 */
const dropIndexesSafely = async (collectionName, timeout = 30000) => {
  try {
    console.log(`Attempting to drop indexes for collection: ${collectionName}`);
    
    const collection = mongoose.connection.collection(collectionName);
    if (!collection) {
      console.log(`Collection ${collectionName} not found`);
      return;
    }

    // Get existing indexes
    const indexes = await collection.indexes();
    console.log(`Found ${indexes.length} indexes in ${collectionName}`);
    
    if (indexes.length <= 1) { // Only _id_ index remains
      console.log(`No custom indexes to drop in ${collectionName}`);
      return;
    }

    // Drop indexes with timeout
    const dropPromise = collection.dropIndexes();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Drop indexes timeout')), timeout);
    });

    await Promise.race([dropPromise, timeoutPromise]);
    console.log(`Successfully dropped indexes for ${collectionName}`);
    
  } catch (error) {
    if (error.message === 'Drop indexes timeout') {
      console.warn(`Timeout dropping indexes for ${collectionName} after ${timeout}ms`);
    } else {
      console.error(`Error dropping indexes for ${collectionName}:`, error.message);
    }
  }
};

/**
 * Create indexes for a model with proper error handling
 * @param {mongoose.Model} model - Mongoose model
 * @param {Array} indexDefinitions - Array of index definitions
 */
const createIndexesSafely = async (model, indexDefinitions = []) => {
  try {
    console.log(`Creating indexes for model: ${model.modelName}`);
    
    for (const indexDef of indexDefinitions) {
      await model.createIndexes(indexDef);
    }
    
    console.log(`Successfully created indexes for ${model.modelName}`);
  } catch (error) {
    console.error(`Error creating indexes for ${model.modelName}:`, error.message);
  }
};

module.exports = {
  dropIndexesSafely,
  createIndexesSafely
}; 