import type { Category } from './category.entity'

export interface CategoryRepository {
  list(): Promise<Category[]>
}
