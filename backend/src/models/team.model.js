import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({}, { timestamps: true });

export const Team = mongoose.model("Team", teamSchema);
