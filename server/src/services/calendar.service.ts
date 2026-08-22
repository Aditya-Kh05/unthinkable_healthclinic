import { google } from 'googleapis';
import { config } from '../config';
import prisma from '../config/database';
import { ApiError } from '../utils/api-error';

const oauth2Client = new google.auth.OAuth2(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri
);

export class CalendarService {
  /**
   * Get OAuth URL for user to authorize Google Calendar
   */
  getAuthUrl(userId: string): string {
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: userId, // Pass userId as state to link token on callback
      prompt: 'consent',
    });
  }

  /**
   * Handle OAuth callback and store tokens
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw ApiError.badRequest('Failed to get complete tokens from Google');
    }

    const expiresAt = new Date(tokens.expiry_date || Date.now() + 3600 * 1000);

    await prisma.googleToken.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      },
    });
  }

  /**
   * Create calendar events for patient and doctor
   */
  async createAppointmentEvent(appointmentId: string): Promise<void> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) return;

    const eventDetails = {
      summary: `HealthClinic Appointment - Dr. ${appointment.doctor.user.name}`,
      description: `Appointment for ${appointment.patient.name} with Dr. ${appointment.doctor.user.name}`,
      start: {
        dateTime: this.formatDateTime(appointment.date, appointment.startTime),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: this.formatDateTime(appointment.date, appointment.endTime),
        timeZone: 'Asia/Kolkata',
      },
    };

    // Create event for patient
    await this.createEventForUser(appointment.patientId, appointmentId, eventDetails);
    
    // Create event for doctor
    await this.createEventForUser(appointment.doctor.userId, appointmentId, eventDetails);
  }

  /**
   * Delete calendar events for patient and doctor
   */
  async deleteAppointmentEvent(appointmentId: string): Promise<void> {
    const events = await prisma.calendarEvent.findMany({
      where: { appointmentId, status: 'active' },
    });

    for (const event of events) {
      try {
        const client = await this.getAuthenticatedClient(event.userId);
        if (client) {
          const calendar = google.calendar({ version: 'v3', auth: client });
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: event.googleEventId,
          });
        }

        await prisma.calendarEvent.update({
          where: { id: event.id },
          data: { status: 'deleted' },
        });
      } catch (error) {
        console.error(`Failed to delete calendar event for user ${event.userId}:`, error);
      }
    }
  }

  /**
   * Internal: Create event for a specific user
   */
  private async createEventForUser(userId: string, appointmentId: string, eventDetails: any): Promise<void> {
    try {
      const client = await this.getAuthenticatedClient(userId);
      if (!client) return; // User hasn't linked Google Calendar

      const calendar = google.calendar({ version: 'v3', auth: client });
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventDetails,
      });

      if (response.data.id) {
        await prisma.calendarEvent.create({
          data: {
            appointmentId,
            userId,
            googleEventId: response.data.id,
            status: 'active',
          },
        });
      }
    } catch (error) {
      console.error(`Failed to create calendar event for user ${userId}:`, error);
    }
  }

  /**
   * Internal: Get authenticated OAuth2 client for a user, refreshing if needed
   */
  private async getAuthenticatedClient(userId: string) {
    if (!config.google.clientId || !config.google.clientSecret) {
      console.warn('Google Calendar credentials not configured');
      return null;
    }

    const tokenRecord = await prisma.googleToken.findUnique({
      where: { userId },
    });

    if (!tokenRecord) return null;

    const client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );

    client.setCredentials({
      access_token: tokenRecord.accessToken,
      refresh_token: tokenRecord.refreshToken,
      expiry_date: tokenRecord.expiresAt.getTime(),
    });

    // Check if token needs refresh
    if (tokenRecord.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
      try {
        const { credentials } = await client.refreshAccessToken();
        
        await prisma.googleToken.update({
          where: { userId },
          data: {
            accessToken: credentials.access_token!,
            expiresAt: new Date(credentials.expiry_date!),
          },
        });
      } catch (error) {
        console.error(`Failed to refresh Google token for user ${userId}:`, error);
        return null;
      }
    }

    return client;
  }

  /**
   * Internal: Format date and time string to ISO DateTime
   */
  private formatDateTime(date: Date, timeStr: string): string {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const d = new Date(date);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  }
}

export const calendarService = new CalendarService();
