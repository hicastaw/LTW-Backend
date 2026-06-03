import jwt from "jsonwebtoken";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET;

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (typeof authHeader !== "undefined") {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, JWT_SECRET, (error, authData) => {
      if (error) {
        console.log("JWT verify error:", error.message);
        return res.status(403).json({ message: "Invalid token" });
      }
      req.user = authData; // { _id, login_name, first_name, last_name }
      next();
    });
  } else {
    return res.status(403).json({ message: "No token provided" });
  }
}

export { verifyToken, JWT_SECRET };
