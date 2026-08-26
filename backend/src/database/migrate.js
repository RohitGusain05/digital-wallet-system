require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pgPool } = require('../config/db');

const runMigration = async () => {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  try {
    await pgPool.query(schema);
    console.log('PostgreSQL schema applied successfully');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pgPool.end();
  }
};

runMigration();
