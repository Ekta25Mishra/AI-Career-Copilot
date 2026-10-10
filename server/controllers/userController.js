
const User = require("../models/User");

function getAuthenticatedUserId(req) {
  return req.user?.userId || req.user?.id || req.user?._id;
}

function getPublicProfile(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    location: user.location || "",
    headline: user.headline || "",
    bio: user.bio || "",
    education: user.education || {},
    skills: user.skills || [],
    projects: user.projects || [],
    internships: user.internships || [],
    certifications: user.certifications || [],
    preferredRoles: user.preferredRoles || [],
    links: user.links || {},
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function getProfile(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      message: "Profile fetched successfully.",
      user: getPublicProfile(user),
    });
  } catch (error) {
    console.error("getProfile error:", error);

    return res.status(500).json({
      message: "Unable to fetch profile.",
    });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const allowedFields = [
      "name",
      "phone",
      "location",
      "headline",
      "bio",
      "education",
      "skills",
      "projects",
      "internships",
      "certifications",
      "preferredRoles",
      "links",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        updates[field] = req.body[field];
      }
    }

    if (updates.name !== undefined) {
      if (typeof updates.name !== "string" || !updates.name.trim()) {
        return res.status(400).json({
          message: "Name is required.",
        });
      }

      updates.name = updates.name.trim();
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      message: "Profile updated successfully.",
      user: getPublicProfile(user),
    });
  } catch (error) {
    console.error("updateProfile error:", error);

    return res.status(400).json({
      message: "Unable to update profile.",
    });
  }
}

module.exports = {
  getProfile,
  updateProfile,
};
