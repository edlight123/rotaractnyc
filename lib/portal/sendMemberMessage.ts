'use server';

import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase/admin';
import { sendMemberToMemberMessage, isResendConfigured } from '@/lib/resend';
import { cookies } from 'next/headers';

export interface SendMessageInput {
  recipientId: string;
  subject: string;
  message: string;
}

export interface SendMessageResult {
  success: boolean;
  error?: string;
}

export async function sendMemberMessage(
  input: SendMessageInput
): Promise<SendMessageResult> {
  try {
    // Check if Resend is configured
    if (!isResendConfigured()) {
      return {
        success: false,
        error: 'Email service is not configured',
      };
    }

    // Get the session cookie and verify authentication
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Verify the session cookie
    const auth = getFirebaseAdminAuth();
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const senderId = decodedClaims.uid;

    // Get Firestore instance
    const db = getFirebaseAdminDb();

    // Fetch sender data
    const senderDoc = await db.collection('users').doc(senderId).get();
    if (!senderDoc.exists) {
      return {
        success: false,
        error: 'Sender not found',
      };
    }

    const senderData = senderDoc.data();
    if (!senderData) {
      return {
        success: false,
        error: 'Sender data not found',
      };
    }

    // Check if sender is an active member
    if (senderData.status !== 'active') {
      return {
        success: false,
        error: 'Only active members can send messages',
      };
    }

    // Fetch recipient data
    const recipientDoc = await db.collection('users').doc(input.recipientId).get();
    if (!recipientDoc.exists) {
      return {
        success: false,
        error: 'Recipient not found',
      };
    }

    const recipientData = recipientDoc.data();
    if (!recipientData) {
      return {
        success: false,
        error: 'Recipient data not found',
      };
    }

    // Validate input
    if (!input.subject.trim()) {
      return {
        success: false,
        error: 'Subject is required',
      };
    }

    if (!input.message.trim()) {
      return {
        success: false,
        error: 'Message is required',
      };
    }

    // Prepare email
    const fromEmail = process.env.RESEND_FROM || 'no-reply@rotaractnyc.org';
    const senderName = senderData.name || 'A Rotaract NYC Member';
    const senderEmail = senderData.email;
    const recipientEmail = recipientData.email;

    if (!recipientEmail) {
      return {
        success: false,
        error: 'Recipient email not found',
      };
    }

    if (!senderEmail) {
      return {
        success: false,
        error: 'Sender email not found',
      };
    }

    // Send email via Resend
    await sendMemberToMemberMessage({
      to: recipientEmail,
      from: fromEmail,
      replyTo: senderEmail,
      subject: input.subject,
      senderName: senderName,
      message: input.message,
    });

    // Log the message metadata (without storing the actual message content)
    await db.collection('memberMessages').add({
      senderId: senderId,
      senderName: senderName,
      senderEmail: senderEmail,
      recipientId: input.recipientId,
      recipientName: recipientData.name || 'Unknown',
      recipientEmail: recipientEmail,
      subject: input.subject,
      sentAt: new Date(),
      status: 'sent',
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error sending member message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}
