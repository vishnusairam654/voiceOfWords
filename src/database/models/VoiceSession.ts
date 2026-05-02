import mongoose, { Document, Schema, Model } from "mongoose";

export interface IVoiceSession extends Document {
  clerkId: string;
  bookId: mongoose.Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
  billingPeriodStart: Date;
}

const VoiceSessionSchema = new Schema<IVoiceSession>({
  clerkId: { type: String, required: true },
  bookId: {
    type: Schema.Types.ObjectId,
    ref: "Book",
    required: true,
  },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  durationSeconds: { type: Number, default: 0 },
  billingPeriodStart: { type: Date, required: true },
});

VoiceSessionSchema.index({ clerkId: 1, billingPeriodStart: 1 });

const VoiceSession: Model<IVoiceSession> =
  mongoose.models.VoiceSession ||
  mongoose.model<IVoiceSession>("VoiceSession", VoiceSessionSchema);

export default VoiceSession;
