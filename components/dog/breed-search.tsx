"use client";

import { useState, useRef, useEffect } from "react";
import { breeds } from "@/lib/breeds";

interface BreedSearchProps {
  value: string;
  onChange: (breed: string) => void;
}

export function BreedSearch({ value, onChange }: BreedSearchProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = breeds.filter(
    (b) =>
      b.nameKo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.nameEn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (breedName: string) => {
    onChange(breedName);
    setSearchTerm(breedName);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="견종을 검색하세요"
        className="w-full px-4 py-3 rounded-xl bg-orange-50/50 border-2 border-orange-100
                   shadow-[inset_2px_2px_4px_rgba(255,165,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]
                   focus:outline-none focus:border-orange-200 transition-all"
      />

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto
                        bg-orange-50/95 backdrop-blur-sm rounded-xl border-2 border-orange-100
                        shadow-[4px_4px_12px_rgba(255,165,0,0.15),-4px_-4px_12px_rgba(255,255,255,0.8)]">
          {filtered.map((breed) => (
            <button
              key={breed.id}
              type="button"
              onClick={() => handleSelect(breed.nameKo)}
              className="w-full px-4 py-2.5 text-left hover:bg-orange-100/60
                         transition-colors border-b border-orange-100/30 last:border-b-0
                         first:rounded-t-xl last:rounded-b-xl"
            >
              <div className="font-medium text-orange-900">{breed.nameKo}</div>
              <div className="text-sm text-orange-600/70">{breed.nameEn}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
