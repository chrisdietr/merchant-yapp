import adminConfig from '../config/admin.json'

export function isAdmin(address: string): boolean {
  return adminConfig.admins.includes(address.toLowerCase())
}

export function requireAdmin(address: string | undefined): boolean {
  if (!address) return false
  return isAdmin(address)
} 