import mongoose from "mongoose";
import * as dotenv from "dotenv";
dotenv.config();

mongoose.set("strictQuery", true);
mongoose.connect(process.env.MONGODB_URI);

mongoose.connection
  .once("open", () => console.log("--Database Connected--"))
  .on("error", (error) => {
    console.log("Your Error", error);
  });

export default mongoose;
