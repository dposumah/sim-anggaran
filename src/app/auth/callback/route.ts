import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session?.user?.email) {
      // Periksa apakah email terdaftar di tabel User (Prisma)
      const registeredUser = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (!registeredUser) {
        // Jika tidak terdaftar, otomatis logout
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=Email%20Anda%20(${session.user.email})%20belum%20didaftarkan%20oleh%20Administrator.`)
      }

      if (!registeredUser.isActive) {
        // Jika tidak aktif, otomatis logout
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=Akun%20Anda%20sedang%20dinonaktifkan.`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Tidak%20dapat%20memverifikasi%20login%20SSO`)
}
