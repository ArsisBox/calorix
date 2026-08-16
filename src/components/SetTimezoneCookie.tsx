"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TIMEZONE_COOKIE } from "@/lib/timezone";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function SetTimezoneCookie() {
  const router = useRouter();

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected) return;

    if (readCookie(TIMEZONE_COOKIE) !== detected) {
      document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(detected)}; path=/; max-age=31536000; SameSite=Lax`;
      router.refresh();
    }
  }, [router]);

  return null;
}
