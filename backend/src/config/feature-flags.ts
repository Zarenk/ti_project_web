export let adsLabKilled = false

export function disableAdsLab() {
  adsLabKilled = true
}

export function isAdsLabEnabled(): boolean {
  if (adsLabKilled) return false
  return process.env.ADSLAB_ENABLED === 'true'
}

export function getAdsLabAllowlistUserIds(): string[] {
  const env = process.env.ADSLAB_ALLOWLIST_USER_IDS
  if (!env) return []
  return env.split(',').map((id) => id.trim()).filter(Boolean)
}

export function getAdsLabAllowlistRoles(): string[] {
  const env = process.env.ADSLAB_ALLOWLIST_ROLES
  if (!env) return []
  return env.split(',').map((r) => r.trim()).filter(Boolean)
}