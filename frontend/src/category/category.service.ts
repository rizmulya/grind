import { categoryPostgrestStore } from './store/category.store.postgrest'
import type { Category } from './category.entity'

export const categoryService = {
  async list(): Promise<Category[]> {
    return categoryPostgrestStore.list()
  },
}
