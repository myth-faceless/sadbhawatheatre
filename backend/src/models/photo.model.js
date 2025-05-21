import mongoose from "mongoose";

const photoSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  public_id: {
    type: String,
    required: true,
  },
  caption: {
    type: String,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const photoGallerySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    photos: [photoSchema],
  },
  { timestamps: true }
);

export const PhotoGallery = mongoose.model("PhotoGallery", photoGallerySchema);
