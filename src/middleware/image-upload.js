import multer from "multer";
import multerS3 from "multer-s3";
import * as responseHelper from "../services/helpers/response-helper.js";
import { BAD_REQUEST } from "../services/helpers/status-code.js";
import { SOMETHING_WENT_WRONG } from "../services/helpers/response-message.js";
import { S3Client } from "@aws-sdk/client-s3";
import { companyS3BucketFolderName } from "../services/helpers/constants.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.S3_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

const imageFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG)$/i)) {
    return cb(new Error("Please upload a valid image!"), false);
  }
  cb(undefined, true);
};

export const uploadCompanyS3Image = multer({
  fileFilter: imageFilter,
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    destination: (req, file, cb) => {
      const folderpath = companyS3BucketFolderName;
      cb(null, folderpath);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },

    key: function (req, file, cb) {
      // const foldername = req.headers.foldername;
      const foldername = companyS3BucketFolderName;
      // if (!foldername) {
      //   return cb(new Error("Please provide a bucket folder name"));
      // }
      const filename = Date.now().toString() + "-" + file.originalname.replace(/ +/g, "");
      const filepath = foldername ? `${foldername}/${filename}` : filename;
      file.filename = filename;
      cb(null, filepath);
    },
  }),
});

export const uploadUserProfileS3Image = multer({
  fileFilter: imageFilter,
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    destination: (req, file, cb) => {
      const folderName = "user-profile";
      cb(null, folderName);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },

    key: function (req, file, cb) {
      const folderName = "user-profile";
      // if (!foldername) {
      //   return cb(new Error("Please provide a bucket folder name"));
      // }
      const filename = Date.now().toString() + "-" + file.originalname.replace(/ +/g, "");
      const filepath = folderName ? `${folderName}/${filename}` : filename;
      file.filename = filename;
      cb(null, filepath);
    },
  }),
});

export const validMulterUploadMiddleware = (multerUploadFunction) => {
  return (req, res, next) =>
    multerUploadFunction(req, res, (err) => {
      // if (!req.files || req.files.length === 0) {
      //   return responseHelper.error(res, "file is required.", BAD_REQUEST);
      // }
      if (err && err.name && err.name === "MulterError") {
        return responseHelper.error(res, SOMETHING_WENT_WRONG, BAD_REQUEST);
      }
      if (err) {
        return responseHelper.error(res, err.message, BAD_REQUEST);
      } else {
        next();
      }
    });
};

export const deleteFileFromS3 = async (key, foldername) => {
  const deleteParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `${foldername}/${key}`,
  };
  try {
    const data = await s3.send(new DeleteObjectCommand(deleteParams));
    return { success: true, data };
  } catch (error) {
    console.error("Error deleting file from S3:", error);
  }
};
