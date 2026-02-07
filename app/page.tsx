"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { CCMessages } from "@/components/chat/cc-messages";
import { PromptForm } from "@/components/chat/prompt-form";
import { WorkspacePanel } from "@/components/workspace/workspace-panel";
import { DogSelector } from "@/components/dog/dog-selector";
import { useUserId } from "@/lib/use-user-id";
import type { SessionEntry, ConversationResponse } from "@/lib/types";
import { PanelRight } from "lucide-react";

interface PendingMessage {
  id: string;
  content: string;
  timestamp: string;
}

interface Dog {
  dog_id: string;
  name: string;
  breed: string;
}

export default function Home() {
  const userId = useUserId();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConversationResponse["status"]>("idle");
  const [serverMessages, setServerMessages] = useState<SessionEntry[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const postCompletionPollsRef = useRef(0);

  // Fetch dogs when userId is available
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/dogs?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setDogs(data);
        if (data.length > 0 && !selectedDogId) {
          setSelectedDogId(data[0].dog_id);
        }
      })
      .catch(console.error);
  }, [userId, selectedDogId]);

  const getUserMessageText = useCallback((content: string | unknown[]): string => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .filter((b: any) => b.type === "text" && b.text)
        .map((b: any) => b.text)
        .join("\n");
    }
    return "";
  }, []);

  const hasPendingMatch = useCallback(
    (pending: PendingMessage, serverMsgs: SessionEntry[]) => {
      return serverMsgs.some(
        (m) =>
          m.type === "user" &&
          getUserMessageText(m.message.content).includes(pending.content)
      );
    },
    [getUserMessageText]
  );

  // Polling
  useEffect(() => {
    if (!conversationId) return;

    const isDone = status === "completed" || status === "error";
    if (isDone && (pendingMessages.length === 0 || postCompletionPollsRef.current >= 10)) return;
    if (!isDone && status !== "running") return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        if (response.ok) {
          const data: ConversationResponse = await response.json();
          setServerMessages(data.messages);

          if (data.messages.length > 0) {
            setPendingMessages((prev) =>
              prev.filter((p) => !hasPendingMatch(p, data.messages))
            );
          }

          if (data.status === "completed" || data.status === "error") {
            postCompletionPollsRef.current++;
          }

          setStatus(data.status);
          setErrorMessage(data.errorMessage || null);
          setRefreshTrigger((prev) => prev + 1);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [conversationId, status, pendingMessages.length, hasPendingMatch]);

  const messages: SessionEntry[] = [
    ...serverMessages,
    ...pendingMessages.map((p): SessionEntry => ({
      type: "user",
      uuid: p.id,
      parentUuid: serverMessages.length > 0 ? serverMessages[serverMessages.length - 1].uuid : null,
      sessionId: "",
      timestamp: p.timestamp,
      isSidechain: false,
      message: {
        role: "user",
        content: p.content,
      },
    })),
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [serverMessages, pendingMessages]);

  const handleSubmit = useCallback(
    async (content: string) => {
      if (!selectedDogId) {
        setErrorMessage("반려견을 먼저 등록해주세요.");
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);
      postCompletionPollsRef.current = 0;

      const pendingId = `pending-${Date.now()}`;
      const pendingMsg: PendingMessage = {
        id: pendingId,
        content,
        timestamp: new Date().toISOString(),
      };
      setPendingMessages((prev) => [...prev, pendingMsg]);

      try {
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            content,
            dogId: selectedDogId,
            userId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to send message");
        }

        const data = await response.json();
        setConversationId(data.conversationId);
        setStatus("running");
      } catch (error) {
        setPendingMessages((prev) => prev.filter((m) => m.id !== pendingId));
        setErrorMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [conversationId, selectedDogId, userId]
  );

  const handleDogSelect = useCallback((dogId: string) => {
    setSelectedDogId(dogId);
    // Reset conversation when switching dogs
    setConversationId(null);
    setServerMessages([]);
    setPendingMessages([]);
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  const isLoading = status === "running" || isSubmitting;
  const hasMessages = messages.length > 0;
  const selectedDog = dogs.find((d) => d.dog_id === selectedDogId);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 h-[52px]">
        <div className="flex items-center gap-3">
          <span className="text-lg">🐾</span>
          <span className="font-semibold text-sm text-foreground">나의 반려견 전담 조언자</span>
        </div>
        <div className="flex items-center gap-2">
          {dogs.length > 0 && (
            <DogSelector
              dogs={dogs}
              selectedDogId={selectedDogId}
              onSelect={handleDogSelect}
            />
          )}
          {hasMessages && !showWorkspace && (
            <button
              onClick={() => setShowWorkspace(true)}
              className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              title="작업 공간 열기"
            >
              <PanelRight className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={showWorkspace ? 55 : 100} minSize={40}>
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-auto">
              {!hasMessages ? (
                <div className="flex h-full flex-col items-center justify-center px-4">
                  {dogs.length === 0 ? (
                    /* No dogs registered - show welcome */
                    <div className="flex flex-col items-center gap-6 text-center">
                      <div className="text-6xl">🐕</div>
                      <div>
                        <h1 className="text-xl font-bold text-foreground mb-2">
                          반려견 전담 조언자에 오신 것을 환영합니다
                        </h1>
                        <p className="text-muted-foreground text-sm">
                          먼저 반려견을 등록하면, 맞춤형 상담을 시작할 수 있어요.
                        </p>
                      </div>
                      <Link
                        href="/register"
                        className="px-6 py-3 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        반려견 등록하기
                      </Link>
                    </div>
                  ) : (
                    /* Has dogs - show chat prompt */
                    <div className="w-full max-w-xl flex flex-col items-center gap-6">
                      <div className="text-center">
                        <div className="text-5xl mb-4">🐾</div>
                        <h1 className="text-lg font-bold text-foreground mb-1">
                          {selectedDog
                            ? `${selectedDog.name}에 대해 궁금한 점이 있으신가요?`
                            : "반려견을 선택해주세요"}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                          강형욱 훈련사 스타일로 맞춤 상담을 해드릴게요
                        </p>
                      </div>
                      <div className="w-full">
                        <PromptForm
                          onSubmit={handleSubmit}
                          isLoading={isLoading}
                          disabled={status === "running" || !selectedDogId}
                          placeholder="우리 아이에 대해 궁금한 점을 물어보세요..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-3xl mx-auto px-4 py-6">
                  <CCMessages entries={messages} />
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {status === "running" && hasMessages && (
              <div className="mx-4 mb-2 text-sm text-muted-foreground">
                <span className="animate-pulse">상담 중...</span>
              </div>
            )}

            {hasMessages && (
              <div className="border-t border-border p-4">
                <div className="max-w-3xl mx-auto">
                  <PromptForm
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    disabled={status === "running"}
                    placeholder="추가 질문을 입력하세요..."
                  />
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>

        {showWorkspace && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={45} minSize={25}>
              <WorkspacePanel
                conversationId={conversationId}
                refreshTrigger={refreshTrigger}
                onClose={() => setShowWorkspace(false)}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
