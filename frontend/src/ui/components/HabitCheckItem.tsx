import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { CheckCircleIcon as CheckCircleOutline } from '@heroicons/react/24/outline'

interface Props {
  name: string
  categoryName?: string
  completed: boolean
  onToggle: () => void
}

export default function HabitCheckItem({ name, categoryName, completed, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.98] ${
        completed
          ? 'border-indigo-100 bg-indigo-50/50'
          : 'border-gray-100 bg-white shadow-sm'
      }`}
    >
      <div className="flex-shrink-0">
        {completed ? (
          <CheckCircleIcon className="h-6 w-6 text-indigo-500" />
        ) : (
          <CheckCircleOutline className="h-6 w-6 text-gray-300" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span
          className={`block text-sm font-medium ${
            completed ? 'text-gray-400 line-through' : 'text-gray-800'
          }`}
        >
          {name}
        </span>
        {categoryName && (
          <span className="mt-0.5 block text-xs text-gray-400">{categoryName}</span>
        )}
      </div>
    </button>
  )
}
