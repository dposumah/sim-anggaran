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

    const users = await prisma.user.findMany({
      include: {
        skpd: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ data: users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, username, namaLengkap, role, password, skpdId } = body;

    if (!email || !username || !namaLengkap || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if email or username exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 });
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        namaLengkap,
        role,
        password: password || null,
        skpdId: role !== 'ADMIN' && skpdId ? parseInt(skpdId) : null,
      }
    });

    return NextResponse.json({ data: newUser, message: 'User berhasil ditambahkan' });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
