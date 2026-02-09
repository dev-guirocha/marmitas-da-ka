import { NextRequest, NextResponse } from "next/server";

export const COOKIE_NAME = "marmita_admin";

function getAuthValue(): string | null {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return null;
  }

  return password;
}

export function isAuthed(req: NextRequest): boolean {
  const expected = getAuthValue();
  if (!expected) {
    return false;
  }

  const current = req.cookies.get(COOKIE_NAME)?.value;
  return current === expected;
}

export function setAuthCookie(res: NextResponse): void {
  const value = getAuthValue();
  if (!value) {
    throw new Error("APP_PASSWORD não configurada");
  }

  res.cookies.set({
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
