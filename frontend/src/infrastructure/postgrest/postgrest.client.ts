import { PostgrestClient } from '@supabase/postgrest-js'

const pgrestUrl = import.meta.env.VITE_PGREST_URL

let _client: PostgrestClient | null = null
let _token: string | null = null

export function getPostgrest(): PostgrestClient {
  if (!_client) {
    _client = new PostgrestClient(pgrestUrl)
  }
  return _client
}

export function setAuthToken(token: string | null) {
  _token = token
}

export function getToken(): string | null {
  return _token
}
