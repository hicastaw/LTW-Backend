import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dbConnect from "./db/dbConnect.js";
import UserRouter from "./routes/UserRouter.js";
import PhotoRouter from "./routes/PhotoRouter.js";
import AdminRouter from "./routes/AdminRouter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

dbConnect();

// Middleware
app.use(cors({
  origin: "*"
}));
app.use(express.json());

// Serve static images
app.use("/images", express.static(path.join(__dirname, "./images")));

// Public routes (không cần auth)
app.use("/api/admin", AdminRouter);

// Routes
app.use("/api/user", UserRouter);
app.use("/api/photo", PhotoRouter);

app.get("/", (request, response) => {
  response.send({ message: "Hello from photo-sharing app API!" });
});

app.listen(8081, () => {
  console.log("server listening on port 8081");
});
