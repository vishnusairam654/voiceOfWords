"use server";

import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongoose";
import VoiceSession from "@/database/models/VoiceSession";
import mongoose from "mongoose";

export async function startVoiceSession(bookId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  await connectDB();

  const now = new Date();
  const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const session = await VoiceSession.create({
    clerkId: userId,
    bookId: new mongoose.Types.ObjectId(bookId),
    billingPeriodStart,
  });

  return {
    success: true,
    sessionId: session._id.toString(),
    maxDuration: 3600,
  };
}

export async function endVoiceSession(
  sessionId: string,
  durationSeconds: number
) {
  await connectDB();

  await VoiceSession.findByIdAndUpdate(sessionId, {
    endedAt: new Date(),
    durationSeconds,
  });

  return { success: true };
}
