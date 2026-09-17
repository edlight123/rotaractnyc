import { NextRequest, NextResponse } from 'next/server';
import { streamText, type CoreMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { buildSystemPrompt, type Viewer } from '@/lib/sandra-knowledge';
import { upcomingEventsBlock } from '@/lib/sandra-events';
import { SITE } from '@/lib/constants';

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
    '\n\nCLUB DOCUMENTS — excerpts from the club\'s shared Drive. They explain ' +
    'how the club works and what it HAS DONE. Several are explicitly ' +
    'historical (project logs, partner directories, past venues), so treat ' +
    'everything here as background, not as a schedule.\n\n' +
    'THEY ARE NOT A CALENDAR. Never take a date, a time, a venue, or an ' +
    'answer to "what is coming up" from these documents — a project they ' +
    'describe may have ended years ago and a venue they name may be one the ' +
    'club no longer uses. Every one of those facts comes only from the ' +
    'UPCOMING EVENTS block. Where a document and that block disagree, the ' +
    'block is right and the document is out of date.\n\n' +
    'Use them for how things work, who we are, and what we have done before. ' +
    'Cite the document title when you use one. If they don\'t cover the ' +
    'question, say so.\n\n' +
    parts.join('\n\n')
  );
}

export async function POST(request: NextRequest) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: `Sandra isn’t available right now. Please email ${SITE.email}.` },
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

  // The live calendar, always — not only when the question looks event-shaped.
  // "What's on this weekend", "can I bring a friend", "when do you next meet"
  // all need it, and keyword-sniffing the question would miss most of them.
  // It is appended AFTER the documents so that where the two disagree, the
  // calendar is the last thing the model reads.
  const calendar = await upcomingEventsBlock(viewer.tier);

  try {
    const result = streamText({
      model: google(MODEL),
      system: buildSystemPrompt(viewer) + grounding + calendar,
      messages,
      temperature: 0.2,
      // Gemini 2.5 counts its internal thinking against maxTokens but reports
      // only the visible tokens back, so a budget of 800 was silently being
      // spent on reasoning and answers stopped mid-sentence — measured at 91
      // visible tokens with finishReason 'length'. Sandra looks things up in
      // a prompt she has already been handed; she does not need to deliberate
      // to do it, so the thinking budget is zero and the whole allowance goes
      // to the reply.
      maxTokens: 1200,
      providerOptions: {
        google: { thinkingConfig: { thinkingBudget: 0 } },
      },
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
