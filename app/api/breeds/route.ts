import { NextResponse } from "next/server";
import { breeds } from "@/lib/breeds";

/**
 * GET /api/breeds
 * Return breed list for search dropdown
 */
export async function GET() {
  return NextResponse.json(breeds);
}
