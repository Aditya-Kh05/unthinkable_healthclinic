import nodemailer from 'nodemailer';
import { config } from '../config';
import prisma from '../config/database';

// Create transporter — uses SendGrid in prod, Ethereal/console in dev
const transporter = config.sendgridApiKey
  ? nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: config.sendgridApiKey,
      },
    })
  : null;

export class EmailService {
  /**
   * Send booking confirmation email to patient and doctor.
   */
  async sendBookingConfirmation(appointmentId: string): Promise<void> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { name: true, email: true } },
        doctor: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });

    if (!appointment) return;

    const dateStr = new Date(appointment.date).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    // Email to patient
    await this.sendEmail({
      to: appointment.patient.email,
      subject: '✅ Appointment Confirmed — HealthClinic',
      html: this.wrapTemplate(`
        <h2>Appointment Confirmed!</h2>
        <p>Hi ${appointment.patient.name},</p>
        <p>Your appointment has been booked successfully.</p>
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Doctor:</strong> ${appointment.doctor.user.name}</p>
          <p><strong>Specialisation:</strong> ${appointment.doctor.specialisation}</p>
          <p><strong>Date:</strong> ${dateStr}</p>
          <p><strong>Time:</strong> ${appointment.startTime} — ${appointment.endTime}</p>
        </div>
        <p>Please arrive 10 minutes early. If you need to cancel or reschedule, please do so at least 24 hours in advance.</p>
      `),
      userId: appointment.patientId,
      type: 'BOOKING_CONFIRMATION',
    });

    // Email to doctor
    await this.sendEmail({
      to: appointment.doctor.user.email,
      subject: '📋 New Appointment — HealthClinic',
      html: this.wrapTemplate(`
        <h2>New Appointment Booked</h2>
        <p>Hi Dr. ${appointment.doctor.user.name},</p>
        <p>A new appointment has been booked with you.</p>
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Patient:</strong> ${appointment.patient.name}</p>
          <p><strong>Date:</strong> ${dateStr}</p>
          <p><strong>Time:</strong> ${appointment.startTime} — ${appointment.endTime}</p>
        </div>
        <p>A pre-visit symptom summary will be available before the appointment.</p>
      `),
      userId: appointment.doctor.userId,
      type: 'BOOKING_CONFIRMATION',
    });
  }

  /**
   * Send cancellation notification email.
   */
  async sendCancellationEmail(appointmentId: string): Promise<void> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { name: true, email: true } },
        doctor: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });

    if (!appointment) return;

    const dateStr = new Date(appointment.date).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    await this.sendEmail({
      to: appointment.patient.email,
      subject: '❌ Appointment Cancelled — HealthClinic',
      html: this.wrapTemplate(`
        <h2>Appointment Cancelled</h2>
        <p>Hi ${appointment.patient.name},</p>
        <p>Your appointment has been cancelled.</p>
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Doctor:</strong> ${appointment.doctor.user.name}</p>
          <p><strong>Date:</strong> ${dateStr}</p>
          <p><strong>Time:</strong> ${appointment.startTime} — ${appointment.endTime}</p>
        </div>
        <p>You can book a new appointment at any time through the patient portal.</p>
      `),
      userId: appointment.patientId,
      type: 'CANCELLATION',
    });
  }

  /**
   * Send leave notification to affected patients.
   */
  async sendLeaveNotification(
    patientEmail: string,
    patientName: string,
    patientId: string,
    doctorName: string,
    dateStr: string,
    time: string
  ): Promise<void> {
    await this.sendEmail({
      to: patientEmail,
      subject: '⚠️ Appointment Cancelled — Doctor on Leave',
      html: this.wrapTemplate(`
        <h2>Appointment Cancelled Due to Doctor Leave</h2>
        <p>Hi ${patientName},</p>
        <p>We regret to inform you that your appointment has been cancelled because your doctor is on leave.</p>
        <div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Doctor:</strong> ${doctorName}</p>
          <p><strong>Date:</strong> ${dateStr}</p>
          <p><strong>Time:</strong> ${time}</p>
        </div>
        <p>We sincerely apologize for the inconvenience. Please rebook your appointment for another available date.</p>
      `),
      userId: patientId,
      type: 'LEAVE_NOTIFICATION',
    });
  }

  /**
   * Send post-visit summary email to patient.
   */
  async sendPostVisitSummary(appointmentId: string): Promise<void> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: {
          include: { user: { select: { name: true } } },
        },
        postVisitSummary: true,
      },
    });

    if (!appointment || !appointment.postVisitSummary?.patientSummary) return;

    await this.sendEmail({
      to: appointment.patient.email,
      subject: '📄 Your Visit Summary — HealthClinic',
      html: this.wrapTemplate(`
        <h2>Your Visit Summary</h2>
        <p>Hi ${appointment.patient.name},</p>
        <p>Here's a summary of your visit with ${appointment.doctor.user.name}:</p>
        <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; white-space: pre-wrap;">
          ${appointment.postVisitSummary.patientSummary}
        </div>
        <p>Please follow the instructions above and don't hesitate to reach out if you have questions.</p>
      `),
      userId: appointment.patient.id,
      type: 'POST_VISIT_SUMMARY',
    });
  }

  /**
   * Method called by the BullMQ worker to actually send the email.
   */
  async sendMailInternal(to: string, subject: string, html: string, notificationId?: string): Promise<void> {
    try {
      if (transporter) {
        await transporter.sendMail({
          from: `HealthClinic <\${config.emailFrom}>`,
          to,
          subject,
          html,
        });
      } else {
        // Dev mode — log to console
        console.log(`📧 [DEV EMAIL] To: \${to} | Subject: \${subject}`);
      }

      if (notificationId) {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { status: 'SENT', sentAt: new Date() },
        });
      }
    } catch (error) {
      console.error(`❌ Email failed to \${to}:`, error);
      if (notificationId) {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { status: 'FAILED' },
        });
      }
      throw error; // Let BullMQ catch it and retry
    }
  }

  /**
   * Enqueue email job into BullMQ.
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    userId: string;
    type: string;
  }): Promise<void> {
    const { to, subject, html, userId, type } = options;

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        channel: 'EMAIL',
        status: 'PENDING',
        metadata: { to, subject } as any,
      },
    });

    // Dynamically import queue to avoid circular dependency
    const { emailQueue } = await import('../queues/email.queue');
    
    // Add to BullMQ with exponential backoff (3 attempts)
    await emailQueue.add(
      'send-email',
      { to, subject, html, notificationId: notification.id },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }

  /**
   * Wrap email content in a styled template.
   */
  private wrapTemplate(content: string): string {
    return `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🏥 HealthClinic</h1>
        </div>
        <div style="padding: 32px 24px;">
          ${content}
        </div>
        <div style="background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b;">
          <p>This is an automated email from HealthClinic. Please do not reply.</p>
        </div>
      </div>
    `;
  }
}

export const emailService = new EmailService();
