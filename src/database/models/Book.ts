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
  totalSegments: number;
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
    totalSegments: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Book: Model<IBook> =
  mongoose.models.Book || mongoose.model<IBook>("Book", BookSchema);

export default Book;
