import { NextRequest, NextResponse } from 'next/server';
import { streamText, type CoreMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { buildSystemPrompt, type Viewer } from '@/lib/sandra-knowledge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = process.env.SANDRA_MODEL || 'gemini-2.5-flash';
const BOARD_ROLES = ['admin', 'president', 'board', 'treasurer', 'secretary', 'vice-president'];
const MAX_MESSAGES = 20; // keep context (and cost) bounded

/** Resolve the viewer from the portal session cookie. Falls back to public. */
async function resolveViewer(): Promise<Viewer> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) return { tier: 'public' };
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const member = (await adminDb.collection('members').doc(decoded.uid).get()).data();
    if (!member || member.status === 'pending') return { tier: 'public' };
    const firstName = member.firstName || member.displayName?.split(' ')?.[0];
    const role = typeof member.role === 'string' ? member.role : undefined;
    if (role && BOARD_ROLES.includes(role)) return { tier: 'board', firstName, role };
    return { tier: 'member', firstName };
  } catch {
    // Invalid/expired cookie → treat as public rather than error.
    return { tier: 'public' };
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: 'Sandra isn’t available right now. Please email rotaractnewyorkcity@gmail.com.' },
      { status: 503 },
    );
  }

  let body: { messages?: CoreMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: 'Ask Sandra a question to get started.' }, { status: 400 });
  }

  const viewer = await resolveViewer();

  try {
    const result = streamText({
      model: google(MODEL),
      system: buildSystemPrompt(viewer),
      messages,
      temperature: 0.4,
      maxTokens: 700,
    });
    return result.toDataStreamResponse({
      getErrorMessage: (e) => (e instanceof Error ? e.message : String(e)),
    });
  } catch (err) {
    console.error('[sandra] generation error:', err);
    return NextResponse.json(
      { error: 'Sandra hit a snag. Please try again in a moment.' },
      { status: 502 },
    );
  }
}
