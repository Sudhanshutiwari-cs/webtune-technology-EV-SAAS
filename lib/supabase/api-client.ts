import { createClient } from '@supabase/supabase-js'

// Create a simple admin client for API routes (bypasses RLS if needed)
export const createApiClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
// lib/api-client.ts
// lib/api-client.ts
export const apiClient = {
  async get(url: string) {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    })
    return response.json()
  },

  async post(url: string, data: any) {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },

  async put(url: string, data: any) {
    const response = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },

  async delete(url: string) {
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include'
    })
    return response.json()
  }
}