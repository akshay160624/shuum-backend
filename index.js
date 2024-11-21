import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import "./src/connection/server.js";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const PORT = process.env.PORT || 8000;

// routes
import userAuth from "./src/routes/auth.routes.js";
import company from "./src/routes/company.routes.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json(app));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(`${__dirname}/public`));

app.listen(PORT, () => {
  console.log(`--Server is running on port ${PORT}--`);
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome to shuum" });
});

app.use("/api/auth", userAuth);
app.use("/api/company", company);
