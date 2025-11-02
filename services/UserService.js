const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const dbConnection = require('../config/database');
const User = require('../models/User');
const log = require('../utils/logger');

class UserService {
  constructor() {
    this.collection = null;
  }

  async init() {
    this.collection = dbConnection.getCollection(User.collectionName);
    
    // Create indexes
    await this.collection.createIndex({ email: 1 }, { unique: true });
    log.info('User indexes created');
  }

  async create(userData) {
    try {
      const validation = User.validate(userData);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      // Check if user exists
      const existingUser = await this.collection.findOne({ email: userData.email });
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

      const user = {
        ...userData,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };

      const result = await this.collection.insertOne(user);
      
      log.info('User created', { userId: result.insertedId, email: userData.email });

      return { success: true, userId: result.insertedId.toString() };
    } catch (err) {
      log.error('Error creating user', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  async authenticate(email, password) {
    try {
      const user = await this.collection.findOne({ email, isActive: true });
      
      if (!user) {
        log.warn('Authentication failed: user not found', { email });
        return { success: false, error: 'Invalid credentials' };
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        log.warn('Authentication failed: invalid password', { email });
        return { success: false, error: 'Invalid credentials' };
      }

      // Generate tokens
      const accessToken = jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );

      const refreshToken = jwt.sign(
        { id: user._id.toString() },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
      );

      log.info('User authenticated', { userId: user._id, email });

      return {
        success: true,
        token: accessToken,
        refreshToken,
        user: User.sanitize(user)
      };
    } catch (err) {
      log.error('Authentication error', { error: err.message });
      return { success: false, error: 'Authentication failed' };
    }
  }

  async findById(id) {
    try {
      const user = await this.collection.findOne({ _id: new ObjectId(id), isActive: true });
      return user ? User.sanitize(user) : null;
    } catch (err) {
      log.error('Error finding user by ID', { error: err.message, userId: id });
      return null;
    }
  }

  async findAll({ page = 1, limit = 20, role, search }) {
    try {
      const skip = (page - 1) * limit;
      const query = { isActive: true };

      if (role) query.role = role;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const [users, total] = await Promise.all([
        this.collection.find(query).skip(skip).limit(limit).toArray(),
        this.collection.countDocuments(query)
      ]);

      return {
        users: users.map(User.sanitize),
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (err) {
      log.error('Error finding users', { error: err.message });
      throw err;
    }
  }

  async update(id, updateData) {
    try {
      const validation = User.validate(updateData, true);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, parseInt(process.env.BCRYPT_ROUNDS) || 10);
      }

      updateData.updatedAt = new Date();

      const result = await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: 'User not found' };
      }

      log.info('User updated', { userId: id });

      return { success: true };
    } catch (err) {
      log.error('Error updating user', { error: err.message, userId: id });
      return { success: false, error: err.message };
    }
  }

  async delete(id) {
    try {
      // Soft delete
      const result = await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: 'User not found' };
      }

      log.info('User deleted (soft)', { userId: id });

      return { success: true };
    } catch (err) {
      log.error('Error deleting user', { error: err.message, userId: id });
      return { success: false, error: err.message };
    }
  }
}

module.exports = new UserService();