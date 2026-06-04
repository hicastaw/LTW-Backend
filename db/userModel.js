import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  location: { type: String, default: "" },
  description: { type: String, default: "" },
  occupation: { type: String, default: "" },
  login_name: { type: String },
  password: { type: String },
});

export default mongoose.model.Users || mongoose.model("Users", userSchema);
