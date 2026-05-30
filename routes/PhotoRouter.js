import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import Photo from "../db/photoModel.js";
import User from "../db/userModel.js";
import { verifyToken } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Cấu hình multer để lưu ảnh upload vào thư mục images/
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../images"));
  },
  filename: function (req, file, cb) {
    // Tạo tên file unique để tránh conflict
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage });

/**
 * GET /api/photosOfUser/:id
 * Trả về danh sách ảnh của user kèm comments đã được assemble với user info.
 */
router.get("/photosOfUser/:id", async (request, response) => {
  const { id } = request.params;

  try {
    // Kiểm tra user có tồn tại không
    const user = await User.findById(id);
    if (!user) {
      return response.status(400).json({ error: `User with id ${id} not found` });
    }

    // Lấy tất cả ảnh của user
    const photos = await Photo.find({ user_id: id });

    // Assemble response: thêm user info vào mỗi comment
    const result = await Promise.all(
      photos.map(async (photo) => {
        // Tạo plain JS object để tránh Mongoose object restrictions
        const photoObj = {
          _id: photo._id,
          user_id: photo.user_id,
          file_name: photo.file_name,
          date_time: photo.date_time,
          comments: [],
        };

        if (photo.comments && photo.comments.length > 0) {
          // Fetch user info cho mỗi comment
          photoObj.comments = await Promise.all(
            photo.comments.map(async (comment) => {
              const commentUser = await User.findById(
                comment.user_id,
                "_id first_name last_name"
              );
              return {
                _id: comment._id,
                comment: comment.comment,
                date_time: comment.date_time,
                user: commentUser
                  ? {
                      _id: commentUser._id,
                      first_name: commentUser.first_name,
                      last_name: commentUser.last_name,
                    }
                  : null,
              };
            })
          );
        }

        return photoObj;
      })
    );

    response.json(result);
  } catch (err) {
    console.error("Error fetching photos:", err);
    response.status(400).json({ error: `Invalid user id: ${id}` });
  }
});

/**
 * POST /api/commentsOfPhoto/:photo_id
 * Thêm comment vào ảnh (TH3).
 */
router.post("/commentsOfPhoto/:photo_id", verifyToken, async (request, response) => {
  const { photo_id } = request.params;
  const { comment } = request.body;

  if (!comment || comment.trim() === "") {
    return response.status(400).json({ error: "Comment cannot be empty" });
  }

  try {
    const photo = await Photo.findById(photo_id);
    if (!photo) {
      return response.status(400).json({ error: `Photo with id ${photo_id} not found` });
    }

    photo.comments.push({
      comment: comment.trim(),
      date_time: new Date(),
      user_id: request.user._id,
    });

    await photo.save();

    // Lấy user info để trả về cho frontend update ngay
    const commentUser = await User.findById(request.user._id, "_id first_name last_name");
    const addedComment = photo.comments[photo.comments.length - 1];

    response.json({
      _id: addedComment._id,
      comment: addedComment.comment,
      date_time: addedComment.date_time,
      user: {
        _id: commentUser._id,
        first_name: commentUser.first_name,
        last_name: commentUser.last_name,
      },
    });
  } catch (err) {
    console.error("Error adding comment:", err);
    response.status(400).json({ error: "Error adding comment" });
  }
});

/**
 * POST /api/photos/new
 * Upload ảnh mới cho user đang đăng nhập (TH3).
 */
router.post("/new", verifyToken, upload.single("photo"), async (request, response) => {
  if (!request.file) {
    return response.status(400).json({ error: "No photo file provided" });
  }

  try {
    const newPhoto = new Photo({
      file_name: request.file.filename,
      date_time: new Date(),
      user_id: request.user._id,
      comments: [],
    });

    await newPhoto.save();
    response.json({
      _id: newPhoto._id,
      file_name: newPhoto.file_name,
      date_time: newPhoto.date_time,
      user_id: newPhoto.user_id,
      comments: [],
    });
  } catch (err) {
    console.error("Error uploading photo:", err);
    response.status(500).json({ error: "Error uploading photo" });
  }
});

export default router;
