import { NextRequest, NextResponse } from "next/server";
import { setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = body?.password;

  if (!process.env.APP_PASSWORD) {
    return NextResponse.json({ message: "APP_PASSWORD não configurada" }, { status: 500 });
  }

  if (typeof password !== "string" || password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ message: "Senha inválida" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  setAuthCookie(res);
  return res;
}
