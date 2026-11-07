import { FunctionComponent, useSyncExternalStore } from "react";

/**
 * One shared minute-ticker for every relative time on the page. During SSR and hydration
 * the snapshot is `null`, so server and client render the same text (no hydration mismatch).
 */
let now = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  now = Date.now();
  if (!timer) {
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach(l => l());
    }, 60_000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const relative = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
  style: "short",
});

export function formatRelative(date: Date, nowMs: number): string {
  const seconds = Math.round((nowMs - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return relative.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relative.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 7) return relative.format(-days, "day");
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year:
      date.getFullYear() === new Date(nowMs).getFullYear()
        ? undefined
        : "numeric",
  }).format(date);
}

export const TimeDistance: FunctionComponent<{ date: Date | string }> = ({
  date,
}) => {
  const d = new Date(date);
  const current = useSyncExternalStore(
    subscribe,
    () => now,
    () => null,
  );
  return (
    <time
      dateTime={d.toISOString()}
      title={d.toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      })}
    >
      {current === null
        ? d.toISOString().slice(0, 10)
        : formatRelative(d, current)}
    </time>
  );
};
