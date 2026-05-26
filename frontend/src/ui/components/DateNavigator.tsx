import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface Props {
  date: Date
  onChange: (date: Date) => void
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(d: Date): string {
  return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`
}

function isToday(d: Date): boolean {
  const t = new Date()
  return d.toDateString() === t.toDateString()
}

export default function DateNavigator({ date, onChange }: Props) {
  const prevDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    onChange(d)
  }
  const nextDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() + 1)
    onChange(d)
  }
  const goToday = () => onChange(new Date())

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <button onClick={prevDay} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      <div className="flex flex-col items-center">
        <span className="text-sm font-semibold text-gray-900">{formatDate(date)}</span>
        {!isToday(date) && (
          <button
            onClick={goToday}
            className="mt-0.5 text-xs font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2"
          >
            Back to today
          </button>
        )}
      </div>

      <button onClick={nextDay} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  )
}
