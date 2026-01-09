import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      error: 'Deprecated endpoint. Admin auth has migrated from NextAuth to Firebase session cookies.',
      use: '/api/auth/session',
    },
    { status: 410 }
  )
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Deprecated endpoint. Admin auth has migrated from NextAuth to Firebase session cookies.',
      use: '/api/auth/session',
    },
    { status: 410 }
  )
}
