import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // 1. Prisma query (Direct DB Connection)
    await prisma.tahunAnggaran.findFirst();

    // 2. HTTP Request to Supabase REST API (CRITICAL)
    // Supabase Free Tier measures "activity" via their API Gateway (REST/Auth/Storage).
    // Direct Postgres connections (like Prisma) sometimes DO NOT count as activity.
    // So we must hit the REST API explicitly to keep it awake!
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      // Must query an actual table so PostgREST registers it as activity. 
      // Fetching the root /rest/v1/ (OpenAPI spec) might not count.
      await fetch(`${supabaseUrl}/rest/v1/TahunAnggaran?select=id&limit=1`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
    }

    return NextResponse.json({ 
      status: 'success', 
      message: 'Database and REST API connection is alive! Supabase pause prevented.',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Keep-alive error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to connect to database/API',
      error: error.message 
    }, { status: 500 });
  }
}
