import type { CategoryRepository } from '../category.repository'
import type { Category } from '../category.entity'
import { getPostgrest, getToken } from '../../infrastructure/postgrest/postgrest.client'

function mapRow(r: any): Category {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    sortOrder: r.sort_order,
  }
}

function auth<T>(b: T): T {
  const t = getToken()
  if (!t) return b
  return (b as any).setHeader('Authorization', `Bearer ${t}`)
}

export const categoryPostgrestStore: CategoryRepository = {
  async list() {
    const res = await auth(
      getPostgrest().from('categories').select('*').order('sort_order', { ascending: true })
    )
    return (res.data || []).map(mapRow)
  },
}
