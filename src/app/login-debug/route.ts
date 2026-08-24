export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.rincianItemBelanja.count();
    const items = await prisma.rincianItemBelanja.findMany({ take: 5 });
    return NextResponse.json({ count, items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
