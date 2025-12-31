#!/usr/bin/env node

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class MigrationRunner {
  constructor() {
    this.migrationsPath = path.join(__dirname, '../migrations');
    this.connection = null;
  }

  async connect() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/omnimind';
    
    try {
      this.connection = await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    }
  }

  async ensureMigrationsCollection() {
    const db = mongoose.connection.db;
    const collections = await db.listCollections({ name: 'migrations' }).toArray();
    
    if (collections.length === 0) {
      await db.createCollection('migrations');
      console.log('✅ Created migrations collection');
    }
  }

  async getAppliedMigrations() {
    const db = mongoose.connection.db;
    const migrations = await db.collection('migrations').find({}).toArray();
    return migrations.map(m => m.name);
  }

  async markMigrationApplied(name) {
    const db = mongoose.connection.db;
    await db.collection('migrations').insertOne({
      name,
      appliedAt: new Date(),
    });
  }

  async markMigrationRolledBack(name) {
    const db = mongoose.connection.db;
    await db.collection('migrations').deleteOne({ name });
  }

  async getMigrationFiles() {
    if (!fs.existsSync(this.migrationsPath)) {
      fs.mkdirSync(this.migrationsPath, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.js'))
      .sort();

    return files;
  }

  async runMigration(file) {
    const migrationPath = path.join(this.migrationsPath, file);
    const migration = require(migrationPath);

    console.log(`🚀 Running migration: ${file}`);
    
    try {
      if (typeof migration.up === 'function') {
        await migration.up(mongoose);
        await this.markMigrationApplied(file);
        console.log(`✅ Migration applied: ${file}`);
      } else {
        console.warn(`⚠️  Migration ${file} has no up function`);
      }
    } catch (error) {
      console.error(`❌ Migration failed: ${file}`, error);
      throw error;
    }
  }

  async rollbackMigration(file) {
    const migrationPath = path.join(this.migrationsPath, file);
    const migration = require(migrationPath);

    console.log(`↩️  Rolling back migration: ${file}`);
    
    try {
      if (typeof migration.down === 'function') {
        await migration.down(mongoose);
        await this.markMigrationRolledBack(file);
        console.log(`✅ Migration rolled back: ${file}`);
      } else {
        console.warn(`⚠️  Migration ${file} has no down function`);
      }
    } catch (error) {
      console.error(`❌ Rollback failed: ${file}`, error);
      throw error;
    }
  }

  async runAll() {
    await this.connect();
    await this.ensureMigrationsCollection();

    const appliedMigrations = await this.getAppliedMigrations();
    const migrationFiles = await this.getMigrationFiles();

    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      console.log('🎉 No pending migrations');
      await this.disconnect();
      return;
    }

    console.log(`📦 Found ${pendingMigrations.length} pending migration(s)`);

    for (const file of pendingMigrations) {
      await this.runMigration(file);
    }

    console.log('🎉 All migrations completed successfully');
    await this.disconnect();
  }

  async rollback(count = 1) {
    await this.connect();
    await this.ensureMigrationsCollection();

    const appliedMigrations = await this.getAppliedMigrations();
    const migrationFiles = await this.getMigrationFiles();

    const appliedFiles = migrationFiles.filter(
      file => appliedMigrations.includes(file)
    );

    if (appliedFiles.length === 0) {
      console.log('✅ No migrations to roll back');
      await this.disconnect();
      return;
    }

    const filesToRollback = appliedFiles.slice(-count).reverse();

    console.log(`↩️  Rolling back ${filesToRollback.length} migration(s)`);

    for (const file of filesToRollback) {
      await this.rollbackMigration(file);
    }

    console.log('✅ Rollback completed');
    await this.disconnect();
  }

  async create(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${timestamp}_${name}.js`;
    const filePath = path.join(this.migrationsPath, fileName);

    const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  async up(db) {
    // Add your migration logic here
    // Example:
    // await db.collection('users').createIndex({ email: 1 }, { unique: true });
  },

  async down(db) {
    // Add your rollback logic here
    // Example:
    // await db.collection('users').dropIndex('email_1');
  }
};
`;

    fs.writeFileSync(filePath, template);
    console.log(`📄 Created migration: ${fileName}`);
  }

  async status() {
    await this.connect();
    await this.ensureMigrationsCollection();

    const appliedMigrations = await this.getAppliedMigrations();
    const migrationFiles = await this.getMigrationFiles();

    console.log('📋 Migration Status:');
    console.log('===================');

    migrationFiles.forEach(file => {
      const isApplied = appliedMigrations.includes(file);
      const status = isApplied ? '✅ Applied' : '⏳ Pending';
      console.log(`${status} ${file}`);
    });

    const pendingCount = migrationFiles.filter(
      file => !appliedMigrations.includes(file)
    ).length;

    console.log('\n📊 Summary:');
    console.log(`Total migrations: ${migrationFiles.length}`);
    console.log(`Applied: ${appliedMigrations.length}`);
    console.log(`Pending: ${pendingCount}`);

    await this.disconnect();
  }
}

// CLI interface
const runner = new MigrationRunner();
const command = process.argv[2];

(async () => {
  try {
    switch (command) {
      case 'up':
        await runner.runAll();
        break;
      
      case 'down':
        const count = parseInt(process.argv[3]) || 1;
        await runner.rollback(count);
        break;
      
      case 'create':
        const name = process.argv[3];
        if (!name) {
          console.error('❌ Please provide a migration name');
          process.exit(1);
        }
        await runner.create(name);
        break;
      
      case 'status':
        await runner.status();
        break;
      
      default:
        console.log('Usage: node migrate.js [command]');
        console.log('\nCommands:');
        console.log('  up                    Run all pending migrations');
        console.log('  down [count]          Rollback migrations (default: 1)');
        console.log('  create <name>         Create a new migration');
        console.log('  status                Show migration status');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
})();