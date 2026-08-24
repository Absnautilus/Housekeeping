// Supabase (PostgREST/RPC/Edge Function) failures are thrown as plain
// objects with a `message` string, not real Error instances — `err
// instanceof Error` misses them, and String(err) on a plain object just
// gives "[object Object]" instead of the actual reason. This checks for a
// usable message however the error is shaped.
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
    return err.message
  }
  return String(err)
}
