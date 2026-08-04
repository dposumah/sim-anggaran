import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { role, skpdId, isActive, password, namaLengkap } = body;

    const dataToUpdate: any = {};
    if (role !== undefined) dataToUpdate.role = role;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;
    if (password !== undefined && password !== '') dataToUpdate.password = password;
    if (namaLengkap !== undefined) dataToUpdate.namaLengkap = namaLengkap;
    
    if (role === 'ADMIN') {
      dataToUpdate.skpdId = null;
    } else if (skpdId !== undefined) {
      dataToUpdate.skpdId = skpdId ? parseInt(skpdId) : null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(params.id) },
      data: dataToUpdate,
    });

    return NextResponse.json({ data: updatedUser, message: 'User berhasil diupdate' });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.user.delete({
      where: { id: parseInt(params.id) }
    });

    return NextResponse.json({ message: 'User berhasil dihapus' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
