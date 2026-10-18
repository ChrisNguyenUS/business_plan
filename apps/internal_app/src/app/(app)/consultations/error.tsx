'use client'

export default function ConsultationsError({
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div
      className="bg-white rounded-xl p-12 text-center max-w-4xl"
      style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
    >
      <span className="material-symbols-outlined text-4xl text-slate-200">error</span>
      <p className="mt-3 text-slate-500 font-medium">Couldn&apos;t load consultations</p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-semibold"
        style={{ backgroundColor: '#3AAFB9' }}
      >
        Try again
      </button>
    </div>
  )
}
