import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readVolumeFile, readSandboxFile, killSandbox } from "@/lib/moru";
import { parseSessionJSONL, getSessionFilePath } from "@/lib/session-parser";
import type { ConversationResponse } from "@/lib/types";

/**
 * Read the .agent-complete marker from the sandbox filesystem.
 * Returns parsed marker data or null if not found/sandbox dead.
 */
async function readCompletionMarker(
  sandboxId: string | null,
  volumeId: string | null
): Promise<{ status: string; sessionId?: string; errorMessage?: string } | null> {
  // Primary: read directly from sandbox (bypasses JuiceFS cache)
  if (sandboxId) {
    const content = await readSandboxFile(sandboxId, "/workspace/data/.agent-complete");
    if (content) {
      try {
        return JSON.parse(content);
      } catch {}
    }
  }

  // Fallback: read from volume API (works after JuiceFS sync or sandbox death)
  if (volumeId) {
    try {
      const content = await readVolumeFile(volumeId, "/.agent-complete");
      return JSON.parse(content);
    } catch {}
  }

  return null;
}

/**
 * Read session file content.
 * Primary: direct sandbox exec. Fallback: Volume API.
 */
async function readSessionContent(
  sandboxId: string | null,
  volumeId: string | null,
  sessionId: string
): Promise<string | null> {
  const sessionPath = getSessionFilePath(sessionId);

  // Primary: read directly from sandbox (instant, no JuiceFS delay)
  if (sandboxId) {
    const content = await readSandboxFile(
      sandboxId,
      `/workspace/data${sessionPath}`
    );
    if (content) return content;
  }

  // Fallback: Volume API
  if (volumeId) {
    try {
      return await readVolumeFile(volumeId, sessionPath);
    } catch {}
  }

  return null;
}

/**
 * Discover session ID by reading from sandbox directly.
 */
async function discoverSessionId(
  sandboxId: string | null,
  volumeId: string | null
): Promise<string | null> {
  // Primary: list session files via sandbox exec
  if (sandboxId) {
    const result = await readSandboxFile(
      sandboxId,
      "/dev/stdin" // dummy — we use a ls command instead
    );
    // Actually, use a proper ls command
    try {
      const { default: Sandbox } = await import("@moru-ai/core");
      const sbx = await Sandbox.connect(sandboxId);
      const lsResult = await sbx.commands.run(
        "ls /workspace/data/.claude/projects/-workspace-data/*.jsonl 2>/dev/null | head -1"
      );
      if (lsResult.exitCode === 0 && lsResult.stdout.trim()) {
        const filename = lsResult.stdout.trim().split("/").pop() || "";
        if (filename.endsWith(".jsonl")) {
          return filename.replace(".jsonl", "");
        }
      }
    } catch {}
  }

  // Fallback: Volume API (may fail due to JuiceFS cache)
  if (volumeId) {
    const apiKey = process.env.MORU_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch(
          `https://api.moru.io/volumes/${volumeId}/files?path=${encodeURIComponent("/.claude/projects/-workspace-data")}`,
          { headers: { "X-API-Key": apiKey } }
        );
        if (res.ok) {
          const data = await res.json();
          const files = Array.isArray(data) ? data : (data.files || []);
          const jsonlFile = files.find((f: any) => (f.name || "").endsWith(".jsonl"));
          if (jsonlFile) {
            return jsonlFile.name.replace(".jsonl", "");
          }
        }
      } catch {}
    }
  }

  return null;
}

/**
 * GET /api/conversations/[id]
 * Get conversation state and messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    let sessionId = conversation.sessionId;
    const sandboxId = conversation.sandboxId;
    const volumeId = conversation.volumeId;

    console.log(`[POLL ${id}] status=${conversation.status} sessionId=${sessionId || "NONE"} sandboxId=${sandboxId || "NONE"}`);

    // If no sessionId yet, try to discover it
    if (!sessionId && (sandboxId || volumeId)) {
      sessionId = await discoverSessionId(sandboxId, volumeId);
      if (sessionId) {
        console.log(`[POLL ${id}] Discovered sessionId: ${sessionId}`);
        await prisma.conversation.update({
          where: { id },
          data: { sessionId },
        });
      } else {
        console.log(`[POLL ${id}] No session file found yet`);
      }
    }

    let currentStatus = conversation.status as ConversationResponse["status"];
    let errorMessage = conversation.errorMessage || undefined;

    // If still "running", check for completion marker
    if (currentStatus === "running") {
      const marker = await readCompletionMarker(sandboxId, volumeId);
      if (marker) {
        console.log(`[POLL ${id}] Found completion marker: ${JSON.stringify(marker)}`);

        const newStatus = marker.status === "error" ? "error" : "completed";
        if (!sessionId && marker.sessionId) {
          sessionId = marker.sessionId;
        }
        await prisma.conversation.update({
          where: { id },
          data: {
            status: newStatus,
            sessionId: marker.sessionId || sessionId || null,
            errorMessage: marker.errorMessage || null,
          },
        });
        currentStatus = newStatus as ConversationResponse["status"];
        errorMessage = marker.errorMessage;

        if (sandboxId) {
          killSandbox(sandboxId).catch(() => {});
        }
      } else {
        console.log(`[POLL ${id}] No completion marker yet`);
      }
    }

    const response: ConversationResponse = {
      id: conversation.id,
      status: currentStatus,
      messages: [],
      errorMessage,
    };

    // Read session file
    if (sessionId) {
      console.log(`[POLL ${id}] Reading session...`);
      const content = await readSessionContent(sandboxId, volumeId, sessionId);
      if (content) {
        response.messages = parseSessionJSONL(content);
        console.log(`[POLL ${id}] Got ${response.messages.length} messages`);
      } else {
        console.log(`[POLL ${id}] Could not read session file`);
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in GET /api/conversations/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
