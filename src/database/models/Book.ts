import mongoose, { Document, Schema, Model } from "mongoose";

export interface IBook extends Document {
  clerkId: string;
  title: string;
  author: string;
  slug: string;
  fileURL: string;
  fileBlobKey: string;
  coverURL: string;
  coverBlobKey: string;
  persona: string;
  fileType: string;
  totalSegments: number;
  shortSummary: string;
  detailedSummary: string;
  keyPoints: string[];
  createdAt: Date;
}

const BookSchema = new Schema<IBook>(
  {
    clerkId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    fileURL: { type: String, required: true },
    fileBlobKey: { type: String, required: true },
    coverURL: { type: String, required: true },
    coverBlobKey: { type: String, required: true },
    persona: { type: String, required: true },
    fileType: { type: String, default: "pdf" },
    totalSegments: { type: Number, default: 0 },
    shortSummary: { type: String, default: "" },
    detailedSummary: { type: String, default: "" },
    keyPoints: [{ type: String }],
  },
  { timestamps: true }
);

const Book: Model<IBook> =
  mongoose.models.Book || mongoose.model<IBook>("Book", BookSchema);

export default Book;
