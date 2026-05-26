import { useState } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Props {
  open: boolean
  habitName: string
  currentTarget: number
  monthLabel: string
  onClose: () => void
  onSubmit: (targetCount: number) => void
}

export default function SetTargetModal({ open, habitName, currentTarget, monthLabel, onClose, onSubmit }: Props) {
  const [target, setTarget] = useState(String(currentTarget || ''))

  const handleSubmit = () => {
    const n = parseInt(target, 10)
    if (isNaN(n) || n < 1) return
    onSubmit(n)
    onClose()
  }

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
                <DialogTitle className="text-lg font-semibold text-gray-900">Set Monthly Target</DialogTitle>
                <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-sm font-medium text-gray-700">{habitName}</p>
                  <p className="text-xs text-gray-400">{monthLabel}</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">
                    Target days per month
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="e.g. 20"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!target || parseInt(target, 10) < 1}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Target
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
