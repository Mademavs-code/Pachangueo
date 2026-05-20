import { cookies } from 'next/headers'

const COOKIE_NAME = 'pachangueo_active_community'

// Función para el SERVIDOR: Lee la cookie y determina qué comunidad mostrar
export async function getActiveCommunityId(userMemberships: any[]) {
  // Si no pertenece a ninguna comunidad, devolvemos null
  if (!userMemberships || userMemberships.length === 0) return null

  // 1. Intentamos leer la cookie del navegador
  const cookieStore = await cookies()
  const savedCommunityId = cookieStore.get(COOKIE_NAME)?.value

  // 2. Si la cookie existe Y el usuario pertenece a esa comunidad, la usamos
  if (savedCommunityId) {
    const isValid = userMemberships.some(m => m.community_id === savedCommunityId)
    if (isValid) return savedCommunityId
  }

  // 3. Si no hay cookie o la cookie es vieja/inválida, devolvemos la primera de la lista por defecto
  return userMemberships[0].community_id
}