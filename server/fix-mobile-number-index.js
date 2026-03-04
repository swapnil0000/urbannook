#!/usr/bin/env node

/**
 * Migration script to fix the mobileNumber index issue
 * This script will drop the old non-sparse index and create a new sparse index
 */

import mongoose from 'mongoose';
import env from './src/config/envConfigSetup.js';

async function fixMobileNumberIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // Get current indexes
    const indexes = await collection.indexes();
    console.log('📋 Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.key.mobileNumber) {
        console.log(`    Sparse: ${index.sparse || false}`);
        console.log(`    Unique: ${index.unique || false}`);
      }
    });

    // Check if there's a non-sparse mobileNumber index
    const mobileNumberIndex = indexes.find(index => 
      index.key.mobileNumber && !index.sparse
    );

    if (mobileNumberIndex) {
      console.log(`🔧 Found non-sparse mobileNumber index: ${mobileNumberIndex.name}`);
      
      // Drop the old index
      await collection.dropIndex(mobileNumberIndex.name);
      console.log(`✅ Dropped old index: ${mobileNumberIndex.name}`);
    }

    // Ensure the correct sparse index exists
    try {
      await collection.createIndex(
        { mobileNumber: 1 }, 
        { 
          sparse: true, 
          unique: true,
          name: 'mobileNumber_1_sparse'
        }
      );
      console.log('✅ Created new sparse unique index for mobileNumber');
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️  Sparse index already exists');
      } else {
        throw error;
      }
    }

    // Verify the fix by checking indexes again
    const updatedIndexes = await collection.indexes();
    const mobileIndexes = updatedIndexes.filter(index => index.key.mobileNumber);
    
    console.log('\n📋 Updated mobileNumber indexes:');
    mobileIndexes.forEach(index => {
      console.log(`  - ${index.name}: sparse=${index.sparse}, unique=${index.unique}`);
    });

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
fixMobileNumberIndex();