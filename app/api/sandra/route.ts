import { NextRequest, NextResponse } from 'next/server';
import { streamText, type CoreMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { buildSystemPrompt, type Viewer } from '@/lib/sandra-knowledge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = process.env.SANDRA_MODEL || 'gemini-flash-latest';
const BOARD_ROLES = ['admin', 'president', 'board', 'treasurer', 'secretary', 'vice-president'];
const MAX_MESSAGES = 20; // keep context (and cost) bounded

type Tier = 'public' | 'member' | 'board';
type CorpusDoc = { title: string; tier: Tier; text: string };

const TIERS_FOR: Record<Viewer['tier'], Tier[]> = {
  public: ['public'],
  member: ['public', 'member'],
  board: ['public', 'member', 'board'],
};

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
    return { tier: 'public' };
  }
}

/** Cache the small corpus in-memory per warm lambda (5 min). */
let corpusCache: { at: number; docs: CorpusDoc[] } | null = null;
async function loadCorpus(): Promise<CorpusDoc[]> {
  if (corpusCache && Date.now() - corpusCache.at < 5 * 60 * 1000) return corpusCache.docs;
  try {
    const snap = await adminDb.collection('sandra_corpus').get();
    const docs = snap.docs.map((d) => d.data() as CorpusDoc).filter((d) => d.text);
    corpusCache = { at: Date.now(), docs };
    return docs;
  } catch (e) {
    console.error('[sandra] corpus load failed:', e);
    return corpusCache?.docs ?? [];
  }
}

/** Pick the most relevant tier-allowed docs for the question (keyword overlap). */
function selectDocs(all: CorpusDoc[], allowed: Tier[], query: string): CorpusDoc[] {
  const pool = all.filter((d) => allowed.includes(d.tier));
  const terms = Array.from(new Set((query.toLowerCase().match(/[a-z0-9]{4,}/g) || [])));
  const scored = pool
    .map((d) => {
      const hay = (d.title + '\n' + d.text).toLowerCase();
      const score = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
      return { d, score };
    })
    .sort((a, b) => b.score - a.score);
  let chosen = scored.filter((s) => s.score > 0).slice(0, 4).map((s) => s.d);
  // Fallback: no keyword hits → include a couple of general references.
  if (chosen.length === 0) {
    const prefer = ['Club Handbook', 'Annual Calendar 2026–2027'];
    chosen = pool.filter((d) => prefer.includes(d.title)).slice(0, 2);
  }
  return chosen;
}

function corpusBlock(docs: CorpusDoc[]): string {
  if (docs.length === 0) return '';
  let budget = 14000;
  const parts: string[] = [];
  for (const d of docs) {
    const body = d.text.slice(0, Math.min(4000, budget));
    if (body.length < 200 && budget < 200) break;
    parts.push(`### ${d.title}\n${body}`);
    budget -= body.length;
    if (budget <= 0) break;
  }
  return (
    '\n\nCLUB DOCUMENTS — authoritative excerpts from the club\'s shared Drive. ' +
    'Prefer these over general knowledge, and cite the document title when you use one. ' +
    'If they don\'t cover the question, say so.\n\n' +
    parts.join('\n\n')
  );
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

  // Ground the answer in the tier-appropriate, most-relevant club documents.
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const query = typeof lastUser?.content === 'string' ? lastUser.content : '';
  let grounding = '';
  try {
    const docs = selectDocs(await loadCorpus(), TIERS_FOR[viewer.tier], query);
    grounding = corpusBlock(docs);
  } catch (e) {
    console.error('[sandra] grounding skipped:', e);
  }

  try {
    const result = streamText({
      model: google(MODEL),
      system: buildSystemPrompt(viewer) + grounding,
      messages,
      temperature: 0.4,
      maxTokens: 800,
    });
    return result.toDataStreamResponse();
  } catch (err) {
    console.error('[sandra] generation error:', err);
    return NextResponse.json(
      { error: 'Sandra hit a snag. Please try again in a moment.' },
      { status: 502 },
    );
  }
}
