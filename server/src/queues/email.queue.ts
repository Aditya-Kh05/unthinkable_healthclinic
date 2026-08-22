import { Queue, Worker } from 'bullmq';
import connection from './connection';
import { emailService } from '../services/email.service';

export const emailQueue = new Queue('email', { connection });

export const emailWorker = new Worker(
  'email',
  async (job) => {
    const { to, subject, html } = job.data;
    console.log(`[BullMQ Worker] Processing email job ${job.id} for ${to}`);
    // Using the internal sendEmail implementation without the retry loop since BullMQ handles retries
    await emailService.sendMailInternal(to, subject, html);
  },
  { connection }
);

emailWorker.on('completed', (job) => {
  console.log(`[BullMQ Worker] Email job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[BullMQ Worker] Email job ${job?.id} failed:`, err.message);
});
