import { Team } from "../models/team.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { USER_ICON } from "../constants/app.constants.js";
import {
  STATUS_CODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "../constants/message.constants.js";

import {
  uploadFilesToCloudinary,
  deleteFileFromCloudinary,
} from "../utils/cloudinary.js";

const addTeamMember = asyncHandler(async (req, res) => {
  const { name, role, bio, socialLinks } = req.body;

  // Validate required fields
  if (!name || !role) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      "Name and role are required fields."
    );
  }

  let avatarUrl = USER_ICON;
  let avatarPublicId = null;

  const avatarLocalPath = req.file;
  if (avatarLocalPath) {
    try {
      const [uploadedAvatar] = await uploadFilesToCloudinary(avatarLocalPath);
      avatarUrl = uploadedAvatar.url;
      avatarPublicId = uploadedAvatar.public_id;
    } catch (uploadError) {
      throw new ApiError(
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.CLOUDINARY_AVATAR_UPLOAD_FAILED,
        [uploadError.message]
      );
    }
  }
  const newTeamMember = await Team.create({
    name,
    role,
    bio,
    photo: {
      url: avatarUrl,
      public_id: avatarPublicId,
    },
    socialLinks,
  });

  return res
    .status(STATUS_CODES.CREATED)
    .json(
      new ApiResponse(
        STATUS_CODES.CREATED,
        newTeamMember,
        SUCCESS_MESSAGES.RESOURCE_CREATED || "Team member added successfully."
      )
    );
});

const getAllTeamMembers = asyncHandler(async (req, res) => {
  const teamMembers = await Team.find();
  res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(
        STATUS_CODES.SUCCESS,
        teamMembers,
        SUCCESS_MESSAGES.ALL_TEAM_FETCHED_SUCCESSFULLY
      )
    );
});

// Get team member by ID
const getTeamMemberById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(
      new ApiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.INVALID_USER_ID)
    );
  }

  const member = await Team.findById(id);

  if (!member) {
    return next(new ApiError(STATUS_CODES.NOT_FOUND, "Team member not found"));
  }

  res
    .status(STATUS_CODES.SUCCESS)
    .json(new ApiResponse(STATUS_CODES.SUCCESS, member, "Team member fetched"));
});

// Add a new team member

// Update team member by ID
const updateTeamMemberById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, role, bio, socialLinks } = req.body;
  const photoFile = req.file;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(
      new ApiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.INVALID_USER_ID)
    );
  }

  const member = await Team.findById(id);

  if (!member) {
    return next(new ApiError(STATUS_CODES.NOT_FOUND, "Team member not found"));
  }

  if (photoFile) {
    if (member.photo?.public_id) {
      await deleteFileFromCloudinary(member.photo.public_id);
    }

    const [uploadedPhoto] = await uploadFilesToCloudinary(photoFile);
    member.photo.url = uploadedPhoto.url;
    member.photo.public_id = uploadedPhoto.public_id;
  }

  member.name = name || member.name;
  member.role = role || member.role;
  member.bio = bio || member.bio;
  member.socialLinks = socialLinks || member.socialLinks;

  await member.save();

  res
    .status(STATUS_CODES.SUCCESS)
    .json(new ApiResponse(STATUS_CODES.SUCCESS, member, "Team member updated"));
});

// Delete team member by ID
const deleteTeamMemberById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(
      new ApiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.INVALID_USER_ID)
    );
  }

  const member = await Team.findById(id);

  if (!member) {
    return next(new ApiError(STATUS_CODES.NOT_FOUND, "Team member not found"));
  }

  if (member.photo?.public_id) {
    await deleteFileFromCloudinary(member.photo.public_id);
  }

  await member.deleteOne();

  res
    .status(STATUS_CODES.SUCCESS)
    .json(new ApiResponse(STATUS_CODES.SUCCESS, null, "Team member deleted"));
});

export {
  getAllTeamMembers,
  getTeamMemberById,
  addTeamMember,
  updateTeamMemberById,
  deleteTeamMemberById,
};
