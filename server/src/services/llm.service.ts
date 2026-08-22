import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import prisma from '../config/database';

// Initialize the Google Generative AI client
const genAI = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;

export class LlmService {
  /**
   * Generate pre-visit summary from patient symptoms.
   * Prompt: symptoms → urgency level, chief complaint, suggested questions
   */
  async generatePreVisitSummary(appointmentId: string): Promise<void> {
    const summary = await prisma.preVisitSummary.findUnique({
      where: { appointmentId },
    });

    if (!summary) {
      console.error(`PreVisitSummary not found for appointment ${appointmentId}`);
      return;
    }

    const prompt = `Analyse these symptoms and return a JSON object with exactly these fields:
- "urgency": one of "Low", "Medium", or "High"
- "chiefComplaint": a one-line summary of the main complaint
- "suggestedQuestions": an array of exactly 3 suggested questions for the doctor

Symptoms: ${summary.symptomsRaw}

Return ONLY valid JSON, no markdown, no explanation.`;

    try {
      const response = await this.callGemini(prompt, true); // true for JSON mode
      const parsed = JSON.parse(response);

      await prisma.preVisitSummary.update({
        where: { appointmentId },
        data: {
          urgency: parsed.urgency || 'Medium',
          chiefComplaint: parsed.chiefComplaint || 'Unable to determine',
          suggestedQuestions: parsed.suggestedQuestions || [],
          llmStatus: 'COMPLETED',
        },
      });

      console.log(`✅ Pre-visit summary generated for appointment ${appointmentId}`);
    } catch (error) {
      console.error(`❌ LLM pre-visit failed for ${appointmentId}:`, error);

      // Retry once
      try {
        const retryResponse = await this.callGemini(prompt, true);
        const parsed = JSON.parse(retryResponse);

        await prisma.preVisitSummary.update({
          where: { appointmentId },
          data: {
            urgency: parsed.urgency || 'Medium',
            chiefComplaint: parsed.chiefComplaint || 'Unable to determine',
            suggestedQuestions: parsed.suggestedQuestions || [],
            llmStatus: 'COMPLETED',
          },
        });

        console.log(`✅ Pre-visit summary generated on retry for ${appointmentId}`);
      } catch (retryError) {
        console.error(`❌ LLM pre-visit retry failed for ${appointmentId}:`, retryError);

        // Mark as failed — store raw, don't crash
        await prisma.preVisitSummary.update({
          where: { appointmentId },
          data: { llmStatus: 'FAILED' },
        });
      }
    }
  }

  /**
   * Generate post-visit summary from doctor's clinical notes.
   * Prompt: clinical notes → patient-friendly summary with medication schedule
   */
  async generatePostVisitSummary(appointmentId: string): Promise<void> {
    const summary = await prisma.postVisitSummary.findUnique({
      where: { appointmentId },
    });

    if (!summary) {
      console.error(`PostVisitSummary not found for appointment ${appointmentId}`);
      return;
    }

    // Get prescriptions for context
    const prescriptions = await prisma.prescription.findMany({
      where: { appointmentId },
    });

    const prescriptionText = prescriptions.length > 0
      ? `\n\nPrescriptions:\n${prescriptions.map((p) =>
          `- ${p.medicationName}: ${p.dosage}, ${p.frequency} for ${p.durationDays} days`
        ).join('\n')}`
      : '';

    const prompt = `Convert these clinical notes into a patient-friendly summary. Include:
1. A simple explanation of the diagnosis
2. A medication schedule in a clear format (if any medications)
3. Follow-up steps and care instructions

Clinical Notes: ${summary.clinicalNotes}${prescriptionText}

Write in simple, easy-to-understand language. Be warm and reassuring. Do not use medical jargon.`;

    try {
      const response = await this.callGemini(prompt, false);

      await prisma.postVisitSummary.update({
        where: { appointmentId },
        data: {
          patientSummary: response,
          llmStatus: 'COMPLETED',
        },
      });

      console.log(`✅ Post-visit summary generated for appointment ${appointmentId}`);
    } catch (error) {
      console.error(`❌ LLM post-visit failed for ${appointmentId}:`, error);

      // Retry once
      try {
        const retryResponse = await this.callGemini(prompt, false);

        await prisma.postVisitSummary.update({
          where: { appointmentId },
          data: {
            patientSummary: retryResponse,
            llmStatus: 'COMPLETED',
          },
        });

        console.log(`✅ Post-visit summary generated on retry for ${appointmentId}`);
      } catch (retryError) {
        console.error(`❌ LLM post-visit retry failed for ${appointmentId}:`, retryError);

        await prisma.postVisitSummary.update({
          where: { appointmentId },
          data: { llmStatus: 'FAILED' },
        });
      }
    }
  }

  /**
   * Call Google Gemini API with a prompt.
   */
  private async callGemini(prompt: string, expectJson: boolean): Promise<string> {
    if (!genAI) {
      // Fallback for development without API key
      console.warn('⚠️  No Gemini API key configured, using mock response');
      return this.getMockResponse(expectJson);
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: 'You are a medical AI assistant. Be precise and helpful.',
      generationConfig: {
        temperature: 0.3,
        responseMimeType: expectJson ? 'application/json' : 'text/plain',
      },
    });

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    
    if (!content) {
      throw new Error('Empty response from Gemini');
    }

    return content.trim();
  }

  /**
   * Mock response for development/testing without Gemini key.
   */
  private getMockResponse(expectJson: boolean): string {
    if (expectJson) {
      // Pre-visit mock
      return JSON.stringify({
        urgency: 'Medium',
        chiefComplaint: 'Patient reports symptoms requiring medical attention',
        suggestedQuestions: [
          'How long have you been experiencing these symptoms?',
          'Are the symptoms getting worse over time?',
          'Have you taken any medication for these symptoms?',
        ],
      });
    }

    // Post-visit mock
    return `## Your Visit Summary

Your doctor has reviewed your condition and here is what you need to know:

**What was found:** Based on the examination, your doctor has identified the condition and prescribed appropriate treatment.

**Your Medications:**
Please take your medications as prescribed. Set reminders to ensure you don't miss any doses.

**Next Steps:**
- Follow the prescribed medication schedule carefully
- Rest adequately and stay hydrated
- Contact your doctor if symptoms worsen
- Schedule a follow-up appointment as recommended

Take care and feel better soon! 🏥`;
  }
}

export const llmService = new LlmService();
