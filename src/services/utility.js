import { createTransport } from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";

const service = process.env.EMAIL_SERVICE;
const fromEmail = process.env.EMAIL_FROM;
const password = process.env.EMAIL_PASSWORD;

// email service to send email
export async function sendEmail(email, emailBody, subject) {
  const transport = createTransport({
    service: service,
    host: "smtp.gmail.com",
    secure: true,
    Port: 587,
    auth: {
      user: fromEmail,
      pass: password,
    },
  });
  const mailOptions = {
    to: email,
    from: process.env.EMAIL_FROM,
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

// generate otp and expiry time
export function generateOtpWithExpiry() {
  const otp = Math.floor(100000 + Math.random() * 900000); // generate random 6 digit otp
  const otpExpires = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes expiry
  return { otp, otpExpires };
}

// validate otp
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

// create auth JWT token
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

// options fields validation
export const findOptionByValue = (options, value) => {
  return options.find((option) => option.value.toUpperCase() === value.toUpperCase().trim()) || null;
};

// decrypt email from encrypted email
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

// convert plain password to Hash Password
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

// validate password with comparing
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

// request validation for phone number
export function validatePhoneNumber(phone) {
  let message = "";
  // Convert to string if it's a number
  const phoneString = typeof phone === "number" ? phone.toString() : phone;

  // Check if the phone number is provided
  if (!phoneString) {
    message = "Phone number is required";
  }

  // Check if the phone number contains only digits
  const digitRegex = /^\d+$/;
  if (!digitRegex.test(phoneString)) {
    message = "Phone number must contain only digits";
  }

  // Check if the phone number is between 8 and 10 digits
  if (phoneString.length < 8 || phoneString.length > 10) {
    message = "Phone number must be exactly 8 or 10 digits long";
  }

  return message;
}

// request validation for website url
export function validateWebsiteURL(website, res) {
  let message = "";
  // regex pattern for website URL
  const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/;

  // Validate the website URL against the regex
  if (!urlRegex.test(website)) {
    message = "Invalid website URL";
  }

  return message;
}

// request validation for established year
export function validateEstablishedYear(establishedYear) {
  let message = "";
  // Check if the value is not empty and is a 4-digit number
  if (!establishedYear || !/^\d{4}$/.test(establishedYear.trim())) {
    message = "Established year must be a 4-digit number";
  }

  // Convert to integer and check if it falls within the valid range
  const year = parseInt(establishedYear.trim(), 10);
  const currentYear = new Date().getFullYear();
  if (year < 1000 || year > currentYear) {
    message = "Established year must be between 1000 and the current year";
  }

  return message;
}

// request validation for postal code
export function validatePostalCode(postalCode) {
  let message = "";

  // ZIP code (5 digits or 9 digits with a hyphen)
  const postalCodeRegex = /^[0-9]{5,9}$/;
  if (!postalCode || !postalCodeRegex.test(postalCode.trim())) {
    message = "Invalid postal code";
  }

  return message;
}

// request validation for email
export function validateEmail(email, res) {
  let message = "";
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!email || !emailRegex.test(email.trim())) {
    message = "Invalid email";
  }

  return message;
}

// linked url validation
export function validateLinkedinUrl(url) {
  let message = "";
  const regex = /linkedin\.com\/in\/.+/; // This regex checks for at least one character after "linkedin.com/"

  // Check if the URL contains "linkedin.com"
  if (!url.includes("linkedin.com/in/")) {
    message = "Invalid URL: must contain 'linkedin.com/in/'";
  } else if (url.includes("http://")) {
    message = "Invalid URL: It must contain 'https'";
  } else if (!regex.test(url)) {
    // Check if the URL has a valid path after "linkedin.com/"
    message = "Invalid URL: must have a valid user url";
  } else if (!url.startsWith("https://")) {
    // If the URL does not start with "https://", prepend it
    url = "https://" + url;
  }

  // Return the formatted URL
  return { url, message };
}

// Helper function to determine the S3 folder name
export function getS3BucketFolderName(folderBaseName) {
  const environmentRaw = process.env.ENVIRONMENT_NAME || "LOCAL";
  const environment = environmentRaw.toUpperCase().trim();

  switch (environment) {
    case "PROD":
      return folderBaseName;
    case "DEV":
      return `dev/${folderBaseName}`;
    default:
      return `test/${folderBaseName}`;
  }
}

// Validate array of strings options
export const validateOptionValues = (options = [], dataArray = [], keyname = "") => {
  if (!Array.isArray(dataArray) || !dataArray.every((item) => typeof item === "string")) {
    return { message: `${keyname} must be an array of strings` };
  }

  // Check if all keywords exist in options
  if (!dataArray.every((keyword) => findOptionByValue(options, keyword))) {
    return { message: `Invalid ${keyname} value` };
  }

  // Check for case-insensitive duplicates
  const normalizedDataArray = dataArray.map((keyword) => keyword.toLowerCase());
  if (new Set(normalizedDataArray).size !== normalizedDataArray.length) {
    return { message: `${keyname} duplicate values are not allowed` };
  }

  // Convert all keywords to uppercase for storage
  const dataArrayUppercase = dataArray.map((keyword) => keyword.toUpperCase());
  return { message: "", dataArrayUppercase };
};
