// Generate a unique id, preferring the crypto UUID when available (browser and
// modern Node) and falling back to a timestamped random string otherwise. Used
// both as a React list key and as a per-batch storage-key prefix, so two ids
// generated in the same page session must never collide.
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`
}
