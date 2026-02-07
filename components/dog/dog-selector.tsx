"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface Dog {
  dog_id: string;
  name: string;
  breed: string;
}

interface DogSelectorProps {
  dogs: Dog[];
  selectedDogId: string | null;
  onSelect: (dogId: string) => void;
}

export function DogSelector({ dogs, selectedDogId, onSelect }: DogSelectorProps) {
  const selectedDog = dogs.find((d) => d.dog_id === selectedDogId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg
                     bg-orange-100/50 hover:bg-orange-100
                     border border-orange-200/50
                     transition-colors"
        >
          <span className="text-sm font-medium text-orange-900">
            {selectedDog ? selectedDog.name : "반려견을 선택하세요"}
          </span>
          <ChevronDown className="w-4 h-4 text-orange-700" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-orange-50/95 border-orange-200">
        {dogs.map((dog) => (
          <DropdownMenuItem
            key={dog.dog_id}
            onClick={() => onSelect(dog.dog_id)}
            className="cursor-pointer hover:bg-orange-100/60 focus:bg-orange-100/60"
          >
            <div>
              <div className="font-medium text-orange-900">{dog.name}</div>
              <div className="text-xs text-orange-600/70">{dog.breed}</div>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild>
          <Link
            href="/register"
            className="cursor-pointer border-t border-orange-200/50 mt-1 pt-1
                       hover:bg-orange-100/60 focus:bg-orange-100/60 font-medium text-orange-700"
          >
            + 반려견 등록
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
