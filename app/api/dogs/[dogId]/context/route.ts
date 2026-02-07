import { NextRequest, NextResponse } from "next/server";
import { getDogContext } from "@/lib/dog-store";

/**
 * GET /api/dogs/[dogId]/context
 * Agent calls this via WebFetch to get dog profile + summary
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ dogId: string }> }
) {
  const { dogId } = await params;
  const context = getDogContext(dogId);

  if (!context) {
    return NextResponse.json({ error: "Dog not found" }, { status: 404 });
  }

  return NextResponse.json(context);
}
