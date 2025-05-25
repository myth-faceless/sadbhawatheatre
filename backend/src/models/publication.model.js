import mongoose from "mongoose";

const publicationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    photo: {
      url: {
        type: String,
        required: true,
      },
      public_id: {
        type: String,
        required: false,
        default: null,
      },
    },
    author: {
      type: String,
      required: true,
    },
    publicationDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

export const Publication = mongoose.model("Publication", publicationSchema);
