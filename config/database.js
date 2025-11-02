require('dotenv').config();
const { MongoClient } = require('mongodb');
const log = require('../utils/logger');

class DatabaseConnection {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      const dbName = process.env.MONGODB_DB_NAME || 'deapseak';

      log.info('Connecting to MongoDB...', { uri: uri.replace(/\/\/.*@/, '//***@') });

      this.client = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      this.db = this.client.db(dbName);

      log.info('MongoDB connected successfully', { database: dbName });

      // Test connection
      await this.db.admin().ping();
      
      return this.db;
    } catch (err) {
      log.error('MongoDB connection failed', { error: err.message });
      throw err;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      log.info('MongoDB disconnected');
    }
  }

  getDb() {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  getCollection(name) {
    return this.getDb().collection(name);
  }
}

// Singleton instance
const dbConnection = new DatabaseConnection();

module.exports = dbConnection;