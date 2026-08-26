const { Pool } = require('pg');
const mongoose = require('mongoose');

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pgPool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

const connectPostgreSQL = async () => {
  const client = await pgPool.connect();
  try {
    await client.query('SELECT 1');
    console.log('PostgreSQL connected successfully');
  } finally {
    client.release();
  }
};

const connectMongoDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected successfully');
};

const closeDatabases = async () => {
  await pgPool.end();
  await mongoose.disconnect();
};

module.exports = {
  pgPool,
  connectPostgreSQL,
  connectMongoDB,
  closeDatabases
};
