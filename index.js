import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import "./src/connection/server.js";
import "./src/config/passport.js";
import passport from "passport";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

// routes
import userAuth from "./src/routes/auth.routes.js";
import company from "./src/routes/company.routes.js";
import googleAuth from "./src/routes/google-auth.routes.js";

const PORT = process.env.PORT || 8000;

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: process.env.ENVIRONMENT_NAME === "PROD",
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

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
app.use("/auth", googleAuth); // google Oauth
