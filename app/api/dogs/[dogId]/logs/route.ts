import { NextRequest, NextResponse } from "next/server";
import { searchChatLogs, saveChatLog } from "@/lib/dog-store";

/**
 * GET /api/dogs/[dogId]/logs?q=keyword
 * Search chat logs for a dog
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dogId: string }> }
) {
  const { dogId } = await params;
  const query = request.nextUrl.searchParams.get("q") || "";
  const logs = searchChatLogs(dogId, query);
  return NextResponse.json(logs);
}

/**
 * POST /api/dogs/[dogId]/logs
 * Save a chat log entry
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dogId: string }> }
) {
  try {
    const { dogId } = await params;
    const body = await request.json();

    // Accept both direct fields and agent-style fields (userMessage/agentResponse)
    const log = saveChatLog({
      user_id: body.user_id || "anonymous",
      dog_id: dogId,
      category: body.category || "건강",
      question: body.question || body.userMessage || "",
      answer: body.answer || body.agentResponse || body.content || "",
      metadata: {
        sentiment_score: body.metadata?.sentiment_score || body.sentiment_score || 5,
        behavior_tags: body.metadata?.behavior_tags || body.behavior_tags || [],
        urgency_level: body.metadata?.urgency_level || body.urgency || 1,
        action_item: body.metadata?.action_item || body.action_item || "",
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Error saving chat log:", error);
    return NextResponse.json(
      { error: "Failed to save chat log" },
      { status: 500 }
    );
  }
}
