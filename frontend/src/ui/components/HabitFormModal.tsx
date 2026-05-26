import { useState, useEffect } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { Category } from '../../category/category.entity'

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface HabitFormData {
  name: string
  categoryId: string
  daysOfWeek: number[]
}

export interface EditHabit {
  id: string
  name: string
  categoryId: string
  daysOfWeek: number[]
}

interface Props {
  open: boolean
  categories: Category[]
  editHabit?: EditHabit
  onClose: () => void
  onSubmit: (data: HabitFormData, habitId?: string) => void
}

export default function HabitFormModal({ open, categories, editHabit, onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [days, setDays] = useState<number[]>([])

  useEffect(() => {
    if (!open) return
    if (editHabit) {
      setName(editHabit.name)
      setCategoryId(editHabit.categoryId)
      setDays(editHabit.daysOfWeek)
    } else {
      setName('')
      setCategoryId(categories[0]?.id || '')
      setDays([new Date().getDay()])
    }
  }, [open, editHabit, categories])

  const toggleDay = (d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  const handleSubmit = () => {
    if (!name.trim() || !categoryId || !days.length) return
    onSubmit({ name: name.trim(), categoryId, daysOfWeek: days }, editHabit?.id)
    onClose()
  }

  const isEdit = !!editHabit

  return (
    <Transition show={open}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end justify-center sm:items-center">
          <TransitionChild
            enter="transition-transform duration-300"
            enterFrom="translate-y-full"
            enterTo="translate-y-0"
            leave="transition-transform duration-200"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full"
          >
            <DialogPanel className="w-full max-w-md rounded-t-3xl bg-white px-6 pb-8 pt-6 shadow-xl sm:rounded-3xl">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  {isEdit ? 'Edit Habit' : 'New Habit'}
                </DialogTitle>
                <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Habit name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Morning run"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryId(cat.id)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                          categoryId === cat.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Repeat on</label>
                  <div className="flex gap-2">
                    {dayLabels.map((label, i) => (
                      <button
                        key={i}
                        onClick={() => toggleDay(i)}
                        className={`h-10 w-10 rounded-full text-xs font-semibold transition-all ${
                          days.includes(i)
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {label[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!name.trim() || !categoryId || !days.length}
                  className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isEdit ? 'Save Changes' : 'Create Habit'}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
