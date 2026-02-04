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

// 2. File Filter (Validation)
// Only allow Image files
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/webp"
  ) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type! Only JPEG, PNG, and WEBP are allowed."),
      false,
    );
  }
};

// 3. Multer Configuration
const uploadImgWithMulterToNfcBucket = multer({
  storage: multerS3({
    s3: s3Obj,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE, // to open the image directly in browser , no download

    // Metadata for S3 Object
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },

    // File Naming Logic
    key: (req, file, cb) => {
      const { userId } = req.params || "unknown_user";

      const ext = file.originalname.split(".").pop();
      // Unique Filename: Timestamp + Random Number
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

      // Folder Structure: uploads/USER_ID/filename.jpg
      cb(null, `uploads/${userId}/${filename}`);
    },
  }),

  fileFilter: fileFilter,

  limits: {
    files: 3, 
    fileSize: 5 * 1024 * 1024, // Max 5 MB per file
  },
});

export default uploadImgWithMulterToNfcBucket;
