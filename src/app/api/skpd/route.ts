import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tahunId = searchParams.get('tahunId');

    const skpd = await prisma.skpd.findMany({
      where: tahunId ? { tahunId: parseInt(tahunId) } : undefined,
      orderBy: { kode: 'asc' },
    });

    return NextResponse.json({ data: skpd });
  } catch (error: any) {
    console.error('Error fetching SKPD:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
