export function formatTime(value: string): string {
  return value.split(":").slice(0, 2).join(":");
}
