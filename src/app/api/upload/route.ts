export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    // In a real production app, we would:
    // 1. Convert the file to a buffer (await file.arrayBuffer())
    // 2. Parse the buffer using XLSX
    // 3. Process the data using Prisma (similar to our import_fast.ts script)
    // 
    // For this prototype, we simulate a successful background queuing.
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return NextResponse.json({ 
      success: true, 
      message: `File ${file.name} (${type}) berhasil diunggah dan sedang diproses di latar belakang.` 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

