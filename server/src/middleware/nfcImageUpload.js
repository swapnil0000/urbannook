import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";

const s3Obj = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET,
  },
});

const uploadImgWithMulterToNfcBucket = multer({
  storage: multerS3({
    s3: s3Obj,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const userId = req.userIdForUpload; // middleware se set hoga
      const ext = file.originalname.split(".").pop();
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      cb(null, `uploads/${userId}/${filename}`);
    },
  }),
  limits: {
    files: 4,
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
});

export default uploadImgWithMulterToNfcBucket;
