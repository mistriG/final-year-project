const envApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

function getDefaultApiBaseUrl() {
  // In browser dev sessions, use current host instead of hard-coded localhost.
  // This avoids fetch failures when the app is opened from another machine/IP.
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`
  }
  return 'http://localhost:8000'
}

export const API_BASE_URL = envApiBaseUrl || getDefaultApiBaseUrl()

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
