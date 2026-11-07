import { ReactNode, useEffect, useRef } from "react";

/**
 * Dialog built on the native <dialog> element: focus is kept inside, Escape closes it and
 * the page behind can't be tapped. Works the same in Chrome, Firefox and Safari.
 */
export const Modal = ({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // a tap on the dimmed backdrop closes it (the click lands on the dialog element itself)
      onClick={e => e.target === e.currentTarget && onClose()}
      aria-label={title}
      className="m-auto w-[calc(100%-1.5rem)] max-w-md rounded-lg p-0 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xl backdrop:bg-black/50"
    >
      {open && (
        <div className="p-4">
          <h2 className="text-lg font-bold mb-3">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
};
