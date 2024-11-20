import { createTransport } from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";

const service = process.env.EMAIL_SERVICE;
const fromEmail = process.env.EMAIL_FROM;
const password = process.env.EMAIL_PASSWORD;

export async function sendEmail(email, emailBody, subject) {
  var transport = createTransport({
    service: service,
    host: "smtp.gmail.com",
    secure: true,
    Port: 587,
    auth: {
      user: fromEmail,
      pass: password,
    },
  });
  var mailOptions = {
    to: email,
    from: `<${process.env.EMAIL_FROM}>`,
    subject: subject,
    html: emailBody,
  };
  return new Promise((resolve, reject) => {
    transport
      .sendMail(mailOptions)
      .then((result) => {
        resolve(true);
      })
      .catch((err) => {
        console.log(err);
      });
  });
}

export function generateOtpWithExpiry() {
  const otp = Math.floor(100000 + Math.random() * 900000); // generate random 6 digit otp
  const otpExpires = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes expiry
  return { otp, otpExpires };
}

export async function validateOTP(otp, user) {
  try {
    if ((process.env.ENVIRONMENT_NAME == "DEV" && otp !== 12345) || process.env.ENVIRONMENT_NAME == "PROD") {
      if (user && user.otp === otp) {
        if (user.otp_expiry < new Date()) {
          throw Error(`OTP expired!`);
        }
      } else {
        throw Error(`Invalid OTP!`);
      }
    }
  } catch (err) {
    throw err;
  }
}

export async function createJwtToken(user) {
  try {
    //token object to create token
    let tokenObject = {
      user_id: user.user_id,
      email: user.email,
    };

    const token = jwt.sign({ tokenObject }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
    return token;
  } catch (err) {
    throw err;
  }
}

export const findOptionByValue = (options, value) => {
  return options.find((option) => option.value.toUpperCase() === value.toUpperCase().trim()) || null;
};

export const decryptEmail = (encryptedEmail) => {
  const cypherKey = crypto.createHash("sha256").update("Shuum-sCSovQtN3JUYWhGyn7Pf").digest("base64").substr(0, 32);

  const parts = encryptedEmail.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = Buffer.from(parts[1], "hex");

  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(cypherKey, "utf8"), iv);

  let decryptedEmail = decipher.update(encryptedText, "hex", "utf8");
  decryptedEmail += decipher.final("utf8");

  return decryptedEmail;
};

export async function encryptPasswordToHash(plainTextPassword) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(plainTextPassword.trim(), 10, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

export async function comparePasswords(password, hashPassword) {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password.trim(), hashPassword, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
