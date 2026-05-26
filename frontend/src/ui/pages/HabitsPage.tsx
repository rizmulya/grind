import { useState, useEffect, useRef } from 'react'
import { habitService } from '../../habit/habit.service'
import { categoryService } from '../../category/category.service'
import HabitFormModal from '../components/HabitFormModal'
import type { Habit } from '../../habit/habit.entity'
import type { Category } from '../../category/category.entity'
import type { EditHabit, HabitFormData } from '../components/HabitFormModal'
import { Bars2Icon } from '@heroicons/react/24/outline'

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [editHabit, setEditHabit] = useState<EditHabit | null>(null)

  const dragIndex = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [h, c] = await Promise.all([
        habitService.list(),
        categoryService.list(),
      ])
      if (cancelled) return
      setHabits(h)
      setCategories(c)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [refreshKey])

  const catMap = new Map(categories.map((c) => [c.id, c]))

  const handleEditSubmit = async (data: HabitFormData, habitId?: string) => {
    if (!habitId) return
    await habitService.update(habitId, {
      name: data.name,
      categoryId: data.categoryId,
      daysOfWeek: data.daysOfWeek,
    })
    setEditHabit(null)
    setRefreshKey((k) => k + 1)
  }

  const handleDragStart = (i: number) => {
    dragIndex.current = i
  }

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIndex.current === null || dragIndex.current === i) return

    const updated = [...habits]
    const [moved] = updated.splice(dragIndex.current, 1)
    updated.splice(i, 0, moved)

    dragIndex.current = i
    setHabits(updated)
  }

  const handleDragEnd = async () => {
    dragIndex.current = null
    await habitService.reorder(habits.map((h) => h.id))
  }

  if (loading && habits.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    )
  }

  return (
    <div className="px-4 py-4 pb-6">
      <h2 className="mb-4 text-lg font-bold text-gray-900">All Habits</h2>

      {habits.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-400">No habits yet</p>
          <p className="mt-1 text-xs text-gray-300">Tap + to create your first habit</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((h, i) => {
            const cat = catMap.get(h.categoryId)
            const activeDays = h.daysOfWeek.map((d) => dayLabels[d]).join(', ')
            return (
              <div
                key={h.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-2"
              >
                <button
                  className="touch-none p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Bars2Icon className="h-5 w-5" />
                </button>

                <button
                  onClick={() =>
                    setEditHabit({
                      id: h.id,
                      name: h.name,
                      categoryId: h.categoryId,
                      daysOfWeek: h.daysOfWeek,
                    })
                  }
                  className={`flex-1 rounded-2xl border px-4 py-4 text-left transition-all active:scale-[0.98] ${
                    h.isActive ? 'border-gray-100 bg-white shadow-sm' : 'border-gray-50 bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-semibold text-gray-900">{h.name}</span>
                  {cat && <p className="mt-0.5 text-xs text-gray-400">{cat.name}</p>}
                  <p className="mt-0.5 text-[10px] text-gray-300">{activeDays}</p>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {editHabit && (
        <HabitFormModal
          open={!!editHabit}
          categories={categories}
          editHabit={editHabit}
          onClose={() => setEditHabit(null)}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  )
}
