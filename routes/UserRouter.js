import express from "express";
import User from "../db/userModel.js";

const router = express.Router();

/**
 * GET /api/user/list
 * Trả về danh sách users với chỉ _id, first_name, last_name (dùng cho sidebar).
 */
router.get("/list", async (request, response) => {
  try {
    const users = await User.find({}, "_id first_name last_name");
    response.json(users);
  } catch (err) {
    console.error("Error fetching user list:", err);
    response.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/user/:id
 * Trả về thông tin chi tiết của user theo id.
 */
router.get("/:id", async (request, response) => {
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