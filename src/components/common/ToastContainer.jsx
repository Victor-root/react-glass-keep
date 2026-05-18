import React from "react";

export default function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null;

  // Layout strategy:
  //  - Mobile: the wrapper still spans nearly the full viewport
  //    (left-2 right-2) so a LONG toast has room to wrap into a
  //    readable column, but `items-center` + no `w-full` on the
  //    individual toasts means each one shrinks to its own
  //    content. Short messages like "Appareil connecté" get a
  //    small pill instead of a green bar with empty gutters; long
  //    messages still fill the available width via the natural
  //    flex-shrink-to-fit behaviour.
  //  - Desktop (sm+): centred, content-sized pill capped at
  //    max-w-sm so a "Saved" toast doesn't sprawl across half the
  //    screen.
  return (
    <div
      className="fixed left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[60] space-y-2 flex flex-col items-center"
      style={{ top: "calc(var(--safe-top) + 1rem)" }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`max-w-full sm:max-w-sm px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : toast.type === "error"
                ? "bg-red-600 text-white"
                : "bg-blue-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
