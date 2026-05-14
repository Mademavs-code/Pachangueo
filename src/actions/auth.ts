"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  let callback = formData.get('callback') as string || '/'
  
  // Seguridad: Evitar Open Redirects
  if (!callback.startsWith('/')) callback = '/'

  if (!email || !password) {
    return { error: 'El email y la contraseña son obligatorios.' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Credenciales inválidas. Por favor, inténtalo de nuevo.' }
  }

  revalidatePath('/', 'layout')
  redirect(callback) // <-- Ahora redirige al destino correcto
}

export async function register(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const alias = formData.get('alias') as string;
  let callback = formData.get('callback') as string || '/';
  
  if (!callback.startsWith('/')) callback = '/'

  if (!email || !password || !alias) {
    return { error: 'Todos los campos son obligatorios.' };
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: alias }
    }
  })

  if (authError) return { error: authError.message };

  if (authData.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email: authData.user.email,
      alias: alias,
      is_guest: false,
    } as any);

    if (profileError) {
      return { error: 'Error al crear el perfil público: ' + profileError.message };
    }
  }

  revalidatePath('/', 'layout');
  redirect(callback); // <-- Ahora respeta la invitación
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}