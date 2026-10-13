/**
 * Zoom virtual background for a board member: 1920x1080 PNG with the club
 * logo, the member's name and board title, and the Rotary year.
 *
 * Rendered on demand from the member record, so a new board member or a
 * changed title gets a correct background without anyone redrawing it.
 * Name and title sit in the lower-left, where a person centred in frame
 * won't cover them.
 *
 * Fonts and images live next to this file and are read from disk; the
 * route that serves this lists them in next.config.js
 * (outputFileTracingIncludes) so they ship with the function on Vercel.
 */
import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import path from 'path';

export const ZOOM_BG_WIDTH = 1920;
export const ZOOM_BG_HEIGHT = 1080;

const ASSETS = path.join(process.cwd(), 'lib/zoomBackground/assets');

let assetsPromise: Promise<{
  fonts: { name: string; data: Buffer; weight: 500 | 600 | 800; style: 'normal' }[];
  logo: string;
  wheel: string;
}> | null = null;

function loadAssets() {
  if (!assetsPromise) {
    const read = (f: string) => readFile(path.join(ASSETS, f));
    const dataUrl = async (f: string) => `data:image/png;base64,${(await read(f)).toString('base64')}`;
    assetsPromise = Promise.all([
      read('manrope-latin-800-normal.woff'),
      read('manrope-latin-600-normal.woff'),
      read('inter-latin-500-normal.woff'),
      read('inter-latin-600-normal.woff'),
      dataUrl('logo-white.png'),
      dataUrl('wheel.png'),
    ]).then(([m800, m600, i500, i600, logo, wheel]) => ({
      fonts: [
        { name: 'Manrope', data: m800, weight: 800, style: 'normal' },
        { name: 'Manrope', data: m600, weight: 600, style: 'normal' },
        { name: 'Inter', data: i500, weight: 500, style: 'normal' },
        { name: 'Inter', data: i600, weight: 600, style: 'normal' },
      ],
      logo,
      wheel,
    }));
    // Don't cache a failed read forever.
    assetsPromise.catch(() => { assetsPromise = null; });
  }
  return assetsPromise;
}

export interface ZoomBackgroundInput {
  name: string;
  title: string;
  /** e.g. "2026–2027" */
  rotaryYear: string;
}

export async function renderZoomBackground({ name, title, rotaryYear }: ZoomBackgroundInput) {
  const { fonts, logo, wheel } = await loadAssets();
  // Long names step down so they stay on one line beside the speaker.
  const nameSize = name.length > 26 ? 60 : 76;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          color: '#fff',
          fontFamily: 'Inter',
          backgroundColor: '#771a2c',
          backgroundImage:
            'radial-gradient(circle at 78% 30%, rgba(209,45,74,0.55) 0%, rgba(209,45,74,0) 45%), linear-gradient(135deg, #9B1B30 0%, #771a2c 55%, #3d0a14 100%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img
          src={wheel}
          width={1000}
          height={1000}
          style={{ position: 'absolute', right: -230, top: -170, opacity: 0.07 }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={logo} height={120} width={576} style={{ position: 'absolute', left: 96, top: 80 }} />

        <div style={{ position: 'absolute', left: 96, bottom: 150, display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 72, height: 5, background: '#EBC85B', borderRadius: 3, marginBottom: 30 }} />
          <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: nameSize, letterSpacing: -1.5, lineHeight: 1.02 }}>
            {name}
          </div>
          <div style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 34, color: '#EBC85B', marginTop: 16 }}>
            {title}
          </div>
          <div style={{ fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.72)', marginTop: 14, letterSpacing: 0.5 }}>
            {`Board of Directors · ${rotaryYear}`}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 96,
            right: 96,
            bottom: 64,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 21,
            fontWeight: 500,
            letterSpacing: 0.6,
            color: 'rgba(255,255,255,0.62)',
          }}
        >
          <span>Service Above Self</span>
          <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>rotaractnyc.org</span>
        </div>
      </div>
    ),
    { width: ZOOM_BG_WIDTH, height: ZOOM_BG_HEIGHT, fonts },
  );
}

/** Title shown on the background, matching the Leadership page fallback. */
export function boardTitleFor(m: { boardTitle?: string; role?: string; committee?: string }) {
  return (
    m.boardTitle ||
    (m.role === 'president' ? 'President' : m.role === 'treasurer' ? 'Treasurer' : m.committee || 'Board Member')
  );
}

export function zoomBackgroundFilename(name: string) {
  const slug = name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `rotaract-nyc-zoom-background-${slug || 'board'}.png`;
}
