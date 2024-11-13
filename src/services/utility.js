import { createTransport } from "nodemailer";

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

export async function validateOTP(request, user) {
  try {
    if ((process.env.ENVIRONMENT_NAME == "DEV" && request.otp !== 12345) || process.env.ENVIRONMENT_NAME == "PROD") {
      if (user && user.otp === request.otp) {
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
