import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_FOUND',
    supabaseKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
  })
}