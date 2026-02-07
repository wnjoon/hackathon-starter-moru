import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createVolume,
  createAndLaunchAgent,
} from "@/lib/moru";
import type { SendMessageRequest, SendMessageResponse } from "@/lib/types";

/**
 * POST /api/conversations
 * Send a message - creates conversation if needed
 */
export async function POST(request: NextRequest) {
  try {
    const body: SendMessageRequest = await request.json();
    const { conversationId, content, dogId, userId } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    let conversation;
    let volumeId: string;
    let sessionId: string | undefined;
    let finalDogId: string | undefined;
    let finalUserId: string | undefined;

    if (conversationId) {
      // Follow-up message to existing conversation
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      if (conversation.status === "running") {
        return NextResponse.json(
          { error: "Conversation is already running" },
          { status: 409 }
        );
      }

      volumeId = conversation.volumeId!;
      sessionId = conversation.sessionId || undefined;
      finalDogId = conversation.dogId || undefined;
      finalUserId = conversation.userId || undefined;
    } else {
      // New conversation - create record first
      conversation = await prisma.conversation.create({
        data: {
          status: "idle",
          dogId: dogId || null,
          userId: userId || null,
        },
      });

      // Create volume for this conversation
      volumeId = await createVolume(conversation.id);

      // Update conversation with volumeId
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { volumeId },
      });

      finalDogId = dogId;
      finalUserId = userId;
    }

    // Prepare message content with system context if dogId is available
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    let messageContent = content;

    if (finalDogId) {
      const systemContext = `[SYSTEM_CONTEXT]
BASE_URL=${baseUrl}
DOG_ID=${finalDogId}
USER_ID=${finalUserId || ""}
[/SYSTEM_CONTEXT]

${content}`;
      messageContent = systemContext;
    }

    console.log(`[POST] conversationId=${conversation.id} dogId=${finalDogId || "NONE"} volumeId=${volumeId} contentLength=${messageContent.length}`);

    // Create sandbox and launch agent (fire-and-forget, no streaming connection)
    const { sandboxId } = await createAndLaunchAgent(
      volumeId,
      conversation.id,
      messageContent,
      sessionId
    );

    console.log(`[POST] Sandbox created: ${sandboxId}`);

    // Update conversation to running state
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: "running",
        sandboxId,
      },
    });

    const response: SendMessageResponse = {
      conversationId: conversation.id,
      status: "running",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in POST /api/conversations:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
