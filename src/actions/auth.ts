"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'El email y la contraseña son obligatorios.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Credenciales inválidas. Por favor, inténtalo de nuevo.' }
  }

  // Refrescamos la caché de layout y redirigimos al dashboard
  revalidatePath('/', 'layout')
  redirect('/') 
}

export async function register(formData: FormData) {
  console.log("=== INICIANDO REGISTRO ===");
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const alias = formData.get('alias') as string;

  console.log("Datos recibidos en el servidor:", { email, alias });

  if (!email || !password || !alias) {
    return { error: 'Todos los campos son obligatorios.' };
  }

  console.log("Llamando a supabase.auth.signUp...");
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: alias, // ¡Esto soluciona lo del panel de Authentication!
      }
    }
  })

  console.log("Respuesta de Supabase Auth:", { 
    user: authData?.user?.id, 
    error: authError?.message 
  });

  if (authError) {
    return { error: authError.message };
  }

  if (authData.user) {
    console.log("Usuario creado en Auth. Insertando perfil...");
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: authData.user.id,
      alias: alias,
      is_guest: false,
    } as any);

    if (profileError) {
      console.log("Error al insertar en profiles:", profileError.message);
      return { error: 'Error al crear el perfil público: ' + profileError.message };
    }
  }

  console.log("=== REGISTRO EXITOSO ===");
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  redirect('/login')
}