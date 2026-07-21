import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Lakukan query teringan ke database hanya untuk memberi tahu Supabase bahwa database sedang aktif/digunakan.
    // Query ini akan menjaga proyek Free Tier Supabase agar tidak masuk ke mode "Paused".
    await prisma.tahunAnggaran.findFirst();

    return NextResponse.json({ 
      status: 'success', 
      message: 'Database connection is alive! Supabase pause prevented.',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Keep-alive error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to connect to database',
      error: error.message 
    }, { status: 500 });
  }
}
