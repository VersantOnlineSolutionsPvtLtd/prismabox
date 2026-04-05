const ENABLED =
  process.env.DEBUG === "*" ||
  process.env.DEBUG === "prismabox" ||
  (process.env.DEBUG ?? "").split(",").includes("prismabox");

export function debug(message: string): void {
  if (!ENABLED) return;
  process.stderr.write(`[prismabox] ${message}\n`);
}

export function timed<T>(label: string, fn: () => T): T {
  if (!ENABLED) return fn();
  const start = performance.now();
  const result = fn();
  const elapsed = (performance.now() - start).toFixed(1);
  process.stderr.write(`[prismabox] ${label} (${elapsed}ms)\n`);
  return result;
}

export async function timedAsync<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!ENABLED) return fn();
  const start = performance.now();
  const result = await fn();
  const elapsed = (performance.now() - start).toFixed(1);
  process.stderr.write(`[prismabox] ${label} (${elapsed}ms)\n`);
  return result;
}
