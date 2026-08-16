import { cookies } from "next/headers";
import { DEFAULT_TIMEZONE, TIMEZONE_COOKIE } from "./timezone";

export async function getUserTimezone(): Promise<string> {
  const store = await cookies();
  const value = store.get(TIMEZONE_COOKIE)?.value;
  if (!value) return DEFAULT_TIMEZONE;

  try {
    // Throws for invalid IANA timezone names.
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
