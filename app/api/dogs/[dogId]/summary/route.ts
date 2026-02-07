import { NextRequest, NextResponse } from "next/server";
import { updateDynamicSummary } from "@/lib/dog-store";

/**
 * PUT /api/dogs/[dogId]/summary
 * Update dynamic summary for a dog
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ dogId: string }> }
) {
  try {
    const { dogId } = await params;
    const body = await request.json();

    const summary = updateDynamicSummary(dogId, {
      summary: body.summary || "",
      recent_concerns: body.recent_concerns || [],
      behavior_patterns: body.behavior_patterns || [],
    });

    if (!summary) {
      return NextResponse.json({ error: "Dog not found" }, { status: 404 });
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error updating summary:", error);
    return NextResponse.json(
      { error: "Failed to update summary" },
      { status: 500 }
    );
  }
}
