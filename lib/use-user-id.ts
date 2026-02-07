"use client";

import { useState, useEffect } from "react";

export function useUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem("dog-advisor-user-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("dog-advisor-user-id", id);
    }
    setUserId(id);
  }, []);

  return userId;
}
