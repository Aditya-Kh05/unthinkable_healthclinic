import app from './app';
import { config } from './config';
import prisma from './config/database';
import { connection, emailWorker, reminderWorker } from './queues';

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Workers are automatically initialized on import
    console.log('✅ BullMQ Workers ready');

    // Start server
    app.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:\${config.port}`);
      console.log(`📋 Environment: \${config.env}`);
      console.log(`🔗 Health check: http://localhost:\${config.port}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await emailWorker.close();
  await reminderWorker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await emailWorker.close();
  await reminderWorker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
});

main();
