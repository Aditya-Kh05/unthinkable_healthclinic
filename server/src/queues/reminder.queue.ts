import { Queue, Worker } from 'bullmq';
import connection from './connection';
import { emailService } from '../services/email.service';

export const reminderQueue = new Queue('reminder', { connection });

export const reminderWorker = new Worker(
  'reminder',
  async (job) => {
    const { patientEmail, patientName, medicationName, dosage } = job.data;
    console.log(`[BullMQ Worker] Processing reminder job ${job.id} for ${patientEmail}`);
    
    const subject = `Medication Reminder: ${medicationName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Medication Reminder</h2>
        <p>Hi ${patientName},</p>
        <p>This is your daily reminder to take your medication:</p>
        <ul>
          <li><strong>Medication:</strong> ${medicationName}</li>
          <li><strong>Dosage:</strong> ${dosage}</li>
        </ul>
        <p>Stay healthy!</p>
        <p>Best,<br>HealthClinic Team</p>
      </div>
    `;

    await emailService.sendMailInternal(patientEmail, subject, html);
  },
  { connection }
);

reminderWorker.on('completed', (job) => {
  console.log(`[BullMQ Worker] Reminder job ${job.id} completed successfully`);
});

reminderWorker.on('failed', (job, err) => {
  console.error(`[BullMQ Worker] Reminder job ${job?.id} failed:`, err.message);
});
