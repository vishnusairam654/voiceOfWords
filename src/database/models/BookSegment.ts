import mongoose, { Document, Schema, Model } from "mongoose";

export interface IBookSegment extends Document {
  bookId: mongoose.Types.ObjectId;
  content: string;
  segmentIndex: number;
}

const BookSegmentSchema = new Schema<IBookSegment>({
  bookId: {
    type: Schema.Types.ObjectId,
    ref: "Book",
    required: true,
    index: true,
  },
  content: { type: String, required: true },
  segmentIndex: { type: Number, required: true },
});

BookSegmentSchema.index({ bookId: 1, segmentIndex: 1 }, { unique: true });
BookSegmentSchema.index({ content: "text" });

const BookSegment: Model<IBookSegment> =
  mongoose.models.BookSegment ||
  mongoose.model<IBookSegment>("BookSegment", BookSegmentSchema);

export default BookSegment;
