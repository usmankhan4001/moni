"use client";

import { toast } from "sonner";

/**
 * Run a server action from inside a client component. Uses React's
 * startTransition so the pending action doesn't touch the form's state,
 * and surfaces the ActionResult either as a toast or a thrown error.
 */
export async function runAction<T extends unknown[], R extends { ok: boolean; message: string }>(
  fn: (...args: T) => Promise<R>,
  ...args: T
): Promise<R | null> {
  try {
    const result = await fn(...args);
    if (result.ok) {
      toast.success(result.message);
      return result;
    }
    toast.error(result.message);
    return null;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong. Try again.";
    toast.error(message);
    return null;
  }
}

export function actionErrorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}