// Use the existing tracker only; analytics must never block navigation.
type EventData = Record<string, string | number | boolean | null | undefined>;
export function eventAttrs(name: string, data: EventData) {
  return { "data-insightflare-event": name, "data-insightflare-event-data": JSON.stringify(data) };
}
export function track(name: string, data: EventData) {
  try {
    (window as Window & { insightflare?: { track: (name: string, data: EventData) => void } }).insightflare?.track(name, data);
  } catch { /* Analytics is optional. */ }
}
