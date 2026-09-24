// Recuerda en este dispositivo el último negocio que inició sesión,
// para saludarlo por su nombre en la pantalla de login.
// No se borra al cerrar sesión (a propósito): es un dato de "bienvenida", no de sesión.
export const LAST_BUSINESS_KEY = 'pf_last_business'

// Extrae el nombre visible del negocio desde el usuario que devuelve /auth/login
export function getBusinessName(user) {
  const tenant = user?.tenant
  const name = tenant?.business_name || tenant?.name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

export function saveLastBusiness(user) {
  const name = getBusinessName(user)
  if (!name) return
  try {
    localStorage.setItem(LAST_BUSINESS_KEY, name)
  } catch {
    // localStorage no disponible (modo privado, bloqueado): el saludo es opcional
  }
}

export function getLastBusiness() {
  try {
    const name = localStorage.getItem(LAST_BUSINESS_KEY)
    return name && name.trim() ? name.trim() : null
  } catch {
    return null
  }
}

export function clearLastBusiness() {
  try {
    localStorage.removeItem(LAST_BUSINESS_KEY)
  } catch {
    // ignorar
  }
}
