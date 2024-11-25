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

const excelFileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(csv|CSV)$/i)) {
    return cb(new Error("Please upload a valid file!"), false);
  }
  cb(undefined, true);
};

export const uploadS3File = multer({
  fileFilter: excelFileFilter,
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    destination: (req, file, cb) => {
      const folderPath = "company-excel";
      cb(null, folderPath);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },

    key: function (req, file, cb) {
      const foldername = "company-excel";
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

// // Setup Multer for File Uploads
// export const uploadFile = multer({
//   fileFilter: excelFileFilter,
//   storage: multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, documentPath);
//     },
//     filename: function (req, file, cb) {
//       cb(null, Date.now() + "-" + file.originalname);
//     },
//   }),
// });
