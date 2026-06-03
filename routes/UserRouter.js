import express from "express";
import mongoose from "mongoose";
import User from "../db/userModel.js";
import Photo from "../db/photoModel.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/user/list
 * Trả về danh sách users với chỉ _id, first_name, last_name, photo_count, comment_count (dùng cho sidebar).
 */
router.get("/list", verifyToken, async (request, response) => {
  try {
    const users = await User.find({}, "_id first_name last_name").lean();
    
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const photo_count = await Photo.countDocuments({ user_id: user._id });
        
        // Count all comments across all photos authored by this user
        // Using $unwind to flatten comments, then match user_id
        const commentAggregation = await Photo.aggregate([
          { $unwind: "$comments" },
          { $match: { "comments.user_id": user._id } },
          { $count: "count" }
        ]);
        
        const comment_count = commentAggregation.length > 0 ? commentAggregation[0].count : 0;
        
        return {
          ...user,
          photo_count,
          comment_count,
        };
      })
    );

    response.json(usersWithCounts);
  } catch (err) {
    console.error("Error fetching user list:", err);
    response.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/user/comments/:id
 * Lấy tất cả bình luận do user có id này viết, kèm theo thông tin bức ảnh.
 */
router.get("/comments/:id", verifyToken, async (request, response) => {
  const { id } = request.params;
  
  try {
    const userId = new mongoose.Types.ObjectId(id);
    
    // Tìm tất cả các ảnh có chứa comment của user này
    const photosWithUserComments = await Photo.find({
      "comments.user_id": userId
    });
    
    let allUserComments = [];
    
    photosWithUserComments.forEach(photo => {
      // Lọc ra các comments của chính user này
      const userComments = photo.comments.filter(
        c => String(c.user_id) === String(userId)
      );
      
      userComments.forEach(comment => {
        allUserComments.push({
          _id: comment._id,
          comment: comment.comment,
          date_time: comment.date_time,
          photo: {
            _id: photo._id,
            file_name: photo.file_name,
            user_id: photo.user_id
          }
        });
      });
    });
    
    response.json(allUserComments);
  } catch (err) {
    console.error("Error fetching user comments:", err);
    response.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/user/:id
 * Trả về thông tin chi tiết của user theo id.
 */
router.get("/:id", verifyToken, async (request, response) => {
  const { id } = request.params;
  try {
    const user = await User.findById(id, "_id first_name last_name location description occupation");
    if (!user) {
      return response.status(400).json({ error: `User with id ${id} not found` });
    }
    response.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    response.status(400).json({ error: `Invalid user id: ${id}` });
  }
});

/**
 * POST /api/user
 * Đăng ký user mới (TH3).
 */
router.post("/", async (request, response) => {
  const { login_name, password, first_name, last_name, location, description, occupation } = request.body;

  // Validate required fields
  if (!login_name) {
    return response.status(400).json({ error: "login_name is required" });
  }
  if (!first_name || !last_name) {
    return response.status(400).json({ error: "first_name and last_name are required" });
  }
  if (!password) {
    return response.status(400).json({ error: "password is required" });
  }

  try {
    // Check if login_name already exists
    const existingUser = await User.findOne({ login_name });
    if (existingUser) {
      return response.status(400).json({ error: `Login name '${login_name}' is already taken` });
    }

    const newUser = new User({
      login_name,
      password,
      first_name,
      last_name,
      location: location || "",
      description: description || "",
      occupation: occupation || "",
    });

    await newUser.save();
    response.json({ login_name: newUser.login_name, _id: newUser._id });
  } catch (err) {
    console.error("Error creating user:", err);
    response.status(400).json({ error: "Error creating user" });
  }
});

export default router;