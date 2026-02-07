/**
 * In-memory dog store for hackathon demo.
 * Stores dog profiles, dynamic summaries, and chat logs.
 */

import { randomUUID } from "crypto";

// ============================================================================
// Types
// ============================================================================

export type Category = "식사" | "교육" | "건강" | "기분" | "수면" | "사회화" | "환경";

export interface DogProfile {
  dog_id: string;
  user_id: string;
  name: string;
  breed: string;
  age: number; // months
  weight: number; // kg
  gender: "male" | "female";
  neutered: boolean;
  created_at: string;
}

export interface DynamicSummary {
  dog_id: string;
  last_updated: string;
  summary: string;
  recent_concerns: string[];
  behavior_patterns: string[];
}

export interface ChatLogMetadata {
  sentiment_score: number;
  behavior_tags: string[];
  urgency_level: number;
  action_item: string;
}

export interface ChatLog {
  chat_id: string;
  user_id: string;
  dog_id: string;
  chatTime: string;
  category: Category;
  question: string;
  answer: string;
  metadata: ChatLogMetadata;
}

// ============================================================================
// Storage
// ============================================================================

const dogs = new Map<string, DogProfile>();
const summaries = new Map<string, DynamicSummary>();
const chatLogs = new Map<string, ChatLog[]>(); // key: dog_id

// ============================================================================
// Dog CRUD
// ============================================================================

export function createDog(
  data: Omit<DogProfile, "dog_id" | "created_at">
): DogProfile {
  const dog: DogProfile = {
    ...data,
    dog_id: randomUUID(),
    created_at: new Date().toISOString(),
  };
  dogs.set(dog.dog_id, dog);

  // Initialize empty summary
  summaries.set(dog.dog_id, {
    dog_id: dog.dog_id,
    last_updated: dog.created_at,
    summary: "아직 상담 기록이 없습니다.",
    recent_concerns: [],
    behavior_patterns: [],
  });

  // Initialize empty chat logs
  chatLogs.set(dog.dog_id, []);

  return dog;
}

export function getDog(dogId: string): DogProfile | undefined {
  return dogs.get(dogId);
}

export function getDogsByUser(userId: string): DogProfile[] {
  return Array.from(dogs.values()).filter((d) => d.user_id === userId);
}

// ============================================================================
// Dog Context (Profile + Summary)
// ============================================================================

export function getDogContext(dogId: string) {
  const dog = dogs.get(dogId);
  if (!dog) return null;

  const summary = summaries.get(dogId) || {
    dog_id: dogId,
    last_updated: new Date().toISOString(),
    summary: "아직 상담 기록이 없습니다.",
    recent_concerns: [],
    behavior_patterns: [],
  };

  const logs = chatLogs.get(dogId) || [];
  const recentLogs = logs.slice(-5).map((l) => ({
    chatTime: l.chatTime,
    category: l.category,
    question: l.question,
    answer: l.answer,
  }));

  return { profile: dog, summary, recentLogs };
}

// ============================================================================
// Chat Logs
// ============================================================================

export function saveChatLog(
  data: Omit<ChatLog, "chat_id" | "chatTime">
): ChatLog {
  const log: ChatLog = {
    ...data,
    chat_id: randomUUID(),
    chatTime: new Date().toISOString(),
  };

  const existing = chatLogs.get(data.dog_id) || [];
  existing.push(log);
  chatLogs.set(data.dog_id, existing);

  return log;
}

export function searchChatLogs(dogId: string, query: string): ChatLog[] {
  const logs = chatLogs.get(dogId) || [];
  if (!query.trim()) return logs.slice(-10);

  const q = query.toLowerCase();
  return logs.filter(
    (l) =>
      l.question.toLowerCase().includes(q) ||
      l.answer.toLowerCase().includes(q) ||
      l.category.includes(q) ||
      l.metadata.behavior_tags.some((t) => t.toLowerCase().includes(q))
  );
}

// ============================================================================
// Dynamic Summary
// ============================================================================

export function updateDynamicSummary(
  dogId: string,
  data: Omit<DynamicSummary, "dog_id" | "last_updated">
): DynamicSummary | null {
  const dog = dogs.get(dogId);
  if (!dog) return null;

  const summary: DynamicSummary = {
    dog_id: dogId,
    last_updated: new Date().toISOString(),
    ...data,
  };
  summaries.set(dogId, summary);
  return summary;
}
