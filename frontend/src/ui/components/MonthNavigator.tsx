import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface Props {
  yearMonth: string
  onChange: (yearMonth: string) => void
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function parseYearMonth(ym: string): [number, number] {
  const [y, m] = ym.split('-').map(Number)
  return [y, m]
}

function formatLabel(ym: string): string {
  const [y, m] = parseYearMonth(ym)
  return `${monthNames[m - 1]} ${String(y).slice(2)}`
}

export default function MonthNavigator({ yearMonth, onChange }: Props) {
  const [y, m] = parseYearMonth(yearMonth)

  const prevMonth = () => {
    const d = new Date(y, m - 2, 1)
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
  }
  const nextMonth = () => {
    const d = new Date(y, m, 1)
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <button onClick={prevMonth} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <span className="text-base font-semibold text-gray-900">{formatLabel(yearMonth)}</span>
      <button onClick={nextMonth} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  )
}
