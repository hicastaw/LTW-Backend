import express from "express";
import jwt from "jsonwebtoken";
import User from "../db/userModel.js";
import { JWT_SECRET, verifyToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/admin/me
 * Kiểm tra token còn hạn hay không. Trả về thông tin user nếu hợp lệ.
 */
router.get("/me", verifyToken, async (request, response) => {
  try {
    const user = await User.findById(request.user._id, "_id first_name last_name login_name");
    if (!user) {
      return response.status(404).json({ error: "User not found" });
    }
    response.json({
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      login_name: user.login_name,
    });
  } catch (err) {
    response.status(400).json({ error: "Invalid token" });
  }
});

/**
 * POST /api/admin/login
 * Đăng nhập user. Body: { login_name, password }
 * Response: { token, _id, first_name, last_name, login_name }
 */
router.post("/login", async (request, response) => {
  const { login_name, password } = request.body;

  if (!login_name) {
    return response.status(400).json({ error: "login_name is required" });
  }

  try {
    const user = await User.findOne({ login_name });

    if (!user) {
      return response.status(400).json({ error: `No user with login_name '${login_name}'` });
    }

    // Check password (plain text so sánh trực tiếp)
    if (user.password && user.password !== password) {
      return response.status(400).json({ error: "Wrong password" });
    }

    // Tạo JWT token (hết hạn sau 24 giờ)
    const payload = {
      _id: user._id,
      login_name: user.login_name,
      first_name: user.first_name,
      last_name: user.last_name,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

    response.json({
      token,
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      login_name: user.login_name,
    });
  } catch (err) {
    console.error("Login error:", err);
    response.status(400).json({ error: "Login failed" });
  }
});

/**
 * POST /api/admin/logout
 * Logout phía client tự xóa token khỏi localStorage.
 * Server chỉ phản hồi OK (stateless JWT không cần server-side invalidation).
 */
router.post("/logout", (request, response) => {
  response.json({ message: "Logged out successfully" });
});

export default router;
