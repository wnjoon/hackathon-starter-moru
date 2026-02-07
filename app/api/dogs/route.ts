import { NextRequest, NextResponse } from "next/server";
import { createDog, getDogsByUser } from "@/lib/dog-store";

/**
 * GET /api/dogs?userId=...
 * List dogs for a user
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  return NextResponse.json(getDogsByUser(userId));
}

/**
 * POST /api/dogs
 * Create a new dog profile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, name, breed, age, weight, gender, neutered } = body;

    if (!user_id || !name || !breed || age == null || weight == null || !gender) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const dog = createDog({
      user_id,
      name,
      breed,
      age: Number(age),
      weight: Number(weight),
      gender,
      neutered: Boolean(neutered),
    });

    return NextResponse.json(dog, { status: 201 });
  } catch (error) {
    console.error("Error creating dog:", error);
    return NextResponse.json(
      { error: "Failed to create dog" },
      { status: 500 }
    );
  }
}
