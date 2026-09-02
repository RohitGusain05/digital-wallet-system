require('dotenv').config();

const app = require('./app');
const { connectPostgreSQL, connectMongoDB, closeDatabases } = require('./config/db');

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    await connectPostgreSQL();
    await connectMongoDB();

    const server = app.listen(PORT, HOST, () => {
      console.log(`Digital Wallet API listening on ${HOST}:${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        try {
          await closeDatabases();
          process.exit(0);
        } catch (error) {
          console.error('Shutdown error:', error);
          process.exit(1);
        }
      });
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
