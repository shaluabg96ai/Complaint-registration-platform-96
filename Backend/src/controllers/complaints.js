import crypto from 'crypto';
import { db } from '../config/db.js';
import { complaints, users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { generateFollowUpQuestion } from '../services/ai.js';
import { mockUsers } from './auth.js';

// In-Memory offline fallback database for complaints
export const mockComplaints = [];

/**
 * Controller: POST /api/ai/question
 */
export async function getAiQuestion(req, res) {
  const { complaint_text } = req.body;

  if (!complaint_text || complaint_text.trim() === '') {
    return res.status(400).json({ error: 'Complaint text is required.' });
  }

  try {
    const question = await generateFollowUpQuestion(complaint_text);
    res.status(200).json({ ai_question: question });
  } catch (error) {
    console.error('Error generating AI question:', error);
    res.status(500).json({ error: 'Failed to generate AI follow-up question.' });
  }
}

/**
 * Controller: POST /api/complaints
 */
export async function createComplaint(req, res) {
  const { complaint_text, ai_question, user_answer, ai_answer } = req.body;

  if (!complaint_text) {
    return res.status(400).json({ error: 'Complaint text is required.' });
  }

  // Handle both possible field names: user_answer (from backend requirements) or ai_answer (from backend endpoint spec)
  const finalAnswer = (user_answer || ai_answer || '').trim();
  const finalQuestion = (ai_question || '').trim();

  const userId = req.user.id; // From requireAuth middleware

  try {
    if (!db) {
      // In-Memory offline fallback logic
      const newComplaint = {
        id: crypto.randomUUID(),
        userId,
        complaintText: complaint_text,
        aiQuestion: finalQuestion,
        userAnswer: finalAnswer,
        createdAt: new Date(),
      };

      mockComplaints.push(newComplaint);
      console.log(`[COMPLAINT CONTROLLER] Complaint submitted by user ${req.user.name} (Offline DB)`);
      return res.status(201).json(newComplaint);
    }

    // Supabase Drizzle mode
    const [insertedComplaint] = await db
      .insert(complaints)
      .values({
        userId,
        complaintText: complaint_text,
        aiQuestion: finalQuestion,
        userAnswer: finalAnswer,
      })
      .returning();

    res.status(201).json(insertedComplaint);
  } catch (error) {
    console.error('Error in create-complaint:', error);
    res.status(500).json({ error: 'Failed to save complaint. Please try again.' });
  }
}

/**
 * Controller: GET /api/complaints/my
 */
export async function getMyComplaints(req, res) {
  const userId = req.user.id;

  try {
    if (!db) {
      // In-Memory offline fallback logic
      // Sort descending by created time
      const userComplaints = mockComplaints
        .filter((c) => c.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);

      return res.status(200).json(userComplaints);
    }

    // Supabase Drizzle mode
    const userComplaints = await db
      .select()
      .from(complaints)
      .where(eq(complaints.userId, userId))
      .orderBy(desc(complaints.createdAt));

    res.status(200).json(userComplaints);
  } catch (error) {
    console.error('Error fetching my complaints:', error);
    res.status(500).json({ error: 'Failed to retrieve complaints.' });
  }
}

/**
 * Controller: GET /api/admin/complaints
 */
export async function getAllComplaints(req, res) {
  try {
    if (!db) {
      // In-Memory offline fallback logic
      const allComplaints = mockComplaints
        .map((complaint) => {
          const user = mockUsers.find((u) => u.id === complaint.userId);
          return {
            id: complaint.id,
            userId: complaint.userId,
            complaintText: complaint.complaintText,
            aiQuestion: complaint.aiQuestion,
            userAnswer: complaint.userAnswer,
            createdAt: complaint.createdAt,
            userName: user ? user.name : 'Unknown User',
            userEmail: user ? user.email : 'Unknown Email',
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);

      return res.status(200).json(allComplaints);
    }

    // Supabase Drizzle mode
    // Performs inner join to retrieve complaints alongside corresponding user metadata
    const allComplaints = await db
      .select({
        id: complaints.id,
        userId: complaints.userId,
        complaintText: complaints.complaintText,
        aiQuestion: complaints.aiQuestion,
        userAnswer: complaints.userAnswer,
        createdAt: complaints.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(complaints)
      .innerJoin(users, eq(complaints.userId, users.id))
      .orderBy(desc(complaints.createdAt));

    res.status(200).json(allComplaints);
  } catch (error) {
    console.error('Error fetching all complaints for admin:', error);
    res.status(500).json({ error: 'Failed to retrieve all complaints.' });
  }
}
