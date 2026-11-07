import { dismissToast, useToasts } from "~/utils/toast";

const colors = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-gray-800",
} as const;

export const Toaster = () => {
  const toasts = useToasts();
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      role="status"
      aria-live="polite"
    >
      {toasts.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismissToast(t.id)}
          className={`pointer-events-auto max-w-md w-full sm:w-auto text-left text-sm text-white shadow-lg rounded-lg px-4 py-3 ${colors[t.type]}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
};
