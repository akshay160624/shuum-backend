import multer from "multer";
import multerS3 from "multer-s3";
import * as responseHelper from "../services/helpers/response-helper.js";
import { BAD_REQUEST } from "../services/helpers/status-code.js";
import { SOMETHING_WENT_WRONG } from "../services/helpers/response-message.js";
import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.S3_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG)$/)) {
    return cb(new Error("Please upload a valid image!"), false);
  }
  cb(undefined, true);
};

export const uploadS3 = multer({
  fileFilter,
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    destination: (req, file, cb) => {
      const folderpath = req.headers.foldername ? req.headers.foldername + "/" : "";
      cb(null, folderpath);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },

    key: function (req, file, cb) {
      const foldername = req.headers.foldername;
      if (!foldername) {
        return cb(new Error("Please provide a bucket folder name"));
      }
      const filename = Date.now().toString() + "-" + file.originalname.replace(/ +/g, "");
      const filepath = foldername ? `${foldername}/${filename}` : filename;
      cb(null, filepath);
    },
  }),
});

export const validMulterUploadMiddleware = (multerUploadFunction) => {
  return (req, res, next) =>
    multerUploadFunction(req, res, (err) => {
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

export const deleteFileFromS3 = (key, foldername, next) => {
  const constantParams = {
    Bucket: process.env.S3_BUCKET_NAME + "/" + foldername,
  };
  const deleteParams = {
    Key: key,
    ...constantParams,
  };
  s3.deleteObject(deleteParams, (error, data) => {
    next(error, data);
  });
};
