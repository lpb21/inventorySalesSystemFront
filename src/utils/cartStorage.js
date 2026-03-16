const DEFAULT_CART_STORAGE_KEY = 'invleo_cart_global'
const LEGACY_CART_STORAGE_KEY = 'invah_cart'

const safeParseUser = (value) => {
  if (!value || value === 'undefined' || value === 'null') return null
  try {
    return JSON.parse(value)
  } catch (error) {
    return null
  }
}

const getStoredUser = () => {
  try {
    return safeParseUser(localStorage.getItem('invleo_user'))
  } catch (error) {
    return null
  }
}

export const getCartStorageKey = (currentUser = null) => {
  const user = currentUser || getStoredUser()
  const tenantId = user?.tenant?.id || user?.tenant_id || user?.tenantId
  const userId = user?.id || user?.user_id || user?.userId

  if (tenantId) return `invleo_cart_tenant_${tenantId}`
  if (userId) return `invleo_cart_user_${userId}`

  return DEFAULT_CART_STORAGE_KEY
}

export const getLegacyCartStorageKey = () => LEGACY_CART_STORAGE_KEY
