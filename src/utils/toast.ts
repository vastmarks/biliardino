/**
 * Minimal toast store (replaces react-toastify, ~30 kB): `toast("Saved", { type: "success" })`.
 * Rendered by <Toaster /> in _app.
 */
import { useSyncExternalStore } from "react";

export type ToastType = "success" | "error" | "info";
export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function dismissToast(id: number) {
  items = items.filter(t => t.id !== id);
  emit();
}

export function toast(
  message: string,
  options: { type?: ToastType; duration?: number } = {},
) {
  const id = nextId++;
  // keep the stack short: newest 3
  items = [...items, { id, message, type: options.type ?? "info" }].slice(-3);
  emit();
  setTimeout(() => dismissToast(id), options.duration ?? 4000);
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const empty: ToastItem[] = [];

export function useToasts() {
  return useSyncExternalStore(
    subscribe,
    () => items,
    () => empty,
  );
}
