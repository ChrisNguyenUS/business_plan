'use client';

/**
 * Error boundary for the whole /n400ready segment (it has its own root
 * layout, so without this a thrown error falls back to Next's generic
 * unstyled error screen). Bilingual — language context may not be available
 * in a crashed tree.
 */
export default function N400Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
      <h2 className="text-lg font-bold text-gray-800">
        Đã có lỗi xảy ra · Something went wrong
      </h2>
      <p className="text-sm text-gray-500">
        Vui lòng thử lại. · Please try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-xl bg-teal-600 px-6 py-2.5 font-semibold text-white hover:bg-teal-700"
      >
        Thử lại / Retry
      </button>
    </div>
  );
}
