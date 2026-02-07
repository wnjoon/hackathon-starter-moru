"use client";

import { useState } from "react";
import { BreedSearch } from "./breed-search";

interface DogRegistrationFormProps {
  userId: string;
  onSuccess: (dog: any) => void;
}

export function DogRegistrationForm({ userId, onSuccess }: DogRegistrationFormProps) {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [neutered, setNeutered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !breed.trim() || !age || !weight) {
      setError("모든 필드를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/dogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          name: name.trim(),
          breed: breed.trim(),
          age: parseInt(age),
          weight: parseFloat(weight),
          gender,
          neutered,
        }),
      });

      if (!response.ok) {
        throw new Error("등록에 실패했습니다.");
      }

      const data = await response.json();
      onSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="bg-orange-50/70 backdrop-blur-sm rounded-2xl p-8
                      shadow-[8px_8px_20px_rgba(255,165,0,0.15),-8px_-8px_20px_rgba(255,255,255,0.8)]
                      border border-orange-100/50">
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-orange-900 mb-2">
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-orange-50/50 border-2 border-orange-100
                         shadow-[inset_2px_2px_4px_rgba(255,165,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]
                         focus:outline-none focus:border-orange-200 transition-all"
              placeholder="반려견 이름"
            />
          </div>

          {/* Breed */}
          <div>
            <label className="block text-sm font-semibold text-orange-900 mb-2">
              견종
            </label>
            <BreedSearch value={breed} onChange={setBreed} />
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-semibold text-orange-900 mb-2">
              나이 (개월)
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min="0"
              className="w-full px-4 py-3 rounded-xl bg-orange-50/50 border-2 border-orange-100
                         shadow-[inset_2px_2px_4px_rgba(255,165,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]
                         focus:outline-none focus:border-orange-200 transition-all"
              placeholder="개월 수"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-semibold text-orange-900 mb-2">
              무게 (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              min="0"
              step="0.1"
              className="w-full px-4 py-3 rounded-xl bg-orange-50/50 border-2 border-orange-100
                         shadow-[inset_2px_2px_4px_rgba(255,165,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]
                         focus:outline-none focus:border-orange-200 transition-all"
              placeholder="kg"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-semibold text-orange-900 mb-2">
              성별
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all font-medium
                  ${
                    gender === "male"
                      ? "bg-orange-200/60 border-orange-300 text-orange-900 shadow-[inset_2px_2px_4px_rgba(255,165,0,0.2)]"
                      : "bg-orange-50/50 border-orange-100 text-orange-700 shadow-[2px_2px_6px_rgba(255,165,0,0.1),-2px_-2px_6px_rgba(255,255,255,0.8)]"
                  }`}
              >
                남아
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all font-medium
                  ${
                    gender === "female"
                      ? "bg-orange-200/60 border-orange-300 text-orange-900 shadow-[inset_2px_2px_4px_rgba(255,165,0,0.2)]"
                      : "bg-orange-50/50 border-orange-100 text-orange-700 shadow-[2px_2px_6px_rgba(255,165,0,0.1),-2px_-2px_6px_rgba(255,255,255,0.8)]"
                  }`}
              >
                여아
              </button>
            </div>
          </div>

          {/* Neutered */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-orange-900">
              중성화 여부
            </label>
            <button
              type="button"
              onClick={() => setNeutered(!neutered)}
              className={`relative w-14 h-8 rounded-full transition-all border-2
                ${
                  neutered
                    ? "bg-orange-300 border-orange-400"
                    : "bg-orange-100 border-orange-200"
                }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-white
                           shadow-md transition-all
                           ${neutered ? "left-7" : "left-0.5"}`}
              />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-4 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500
                       text-white font-bold text-lg
                       shadow-[4px_4px_12px_rgba(255,165,0,0.3),-2px_-2px_8px_rgba(255,255,255,0.5)]
                       hover:shadow-[6px_6px_16px_rgba(255,165,0,0.4),-3px_-3px_10px_rgba(255,255,255,0.6)]
                       active:shadow-[inset_2px_2px_6px_rgba(255,140,0,0.4)]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            {isSubmitting ? "등록 중..." : "등록하기"}
          </button>
        </div>
      </div>
    </form>
  );
}
