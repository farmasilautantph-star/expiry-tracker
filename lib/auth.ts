import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

export interface JwtPayload {
  userId: number;
  username: string;
  role: "manager" | "staff";
  picName: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as JwtPayload;
}

export function getTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get("token")?.value ?? null;
}
