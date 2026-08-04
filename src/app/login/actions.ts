'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function loginWithGoogle() {
  const supabase = await createClient()
  // Generate the callback URL for the OAuth flow
  let host = 'http://localhost:3000'
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    host = process.env.NEXT_PUBLIC_SITE_URL
  } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    host = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  } else if (process.env.VERCEL_URL) {
    host = `https://${process.env.VERCEL_URL}`
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${host}/auth/callback`,
    },
  })

  if (data.url) {
    redirect(data.url)
  }

  if (error) {
    return { error: error.message }
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
