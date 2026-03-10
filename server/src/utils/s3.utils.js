import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import env from "../config/envConfigSetup.js"; 

const s3Client = new S3Client({
  region: env.AWS_BUCKET_REGION || "ap-south-1",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY,
    secretAccessKey: env.AWS_SECRET,
  },
});

export const uploadInvoiceToS3 = async (pdfBuffer, userId, orderId) => {
  // Folder structure: nodeEnv/userId/INV-orderId.pdf
  const envFolder = env.NODE_ENV === "production" ? "prod" : "dev";
  const fileKey = `${envFolder}/${userId}/INV-${orderId}.pdf`;

  const params = {
    Bucket: env.AWS_S3_INVOICE_BUCKET,
    Key: fileKey,
    Body: pdfBuffer,
    ContentType: "application/pdf",
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    return fileKey;
  } catch (error) {
    console.error("❌ Error uploading to S3:", error);
    throw error;
  }
};

export const getInvoicePresignedUrl = async (fileKey) => {
  try {
    const command = new GetObjectCommand({
      Bucket: env.AWS_S3_INVOICE_BUCKET || "urbannook-orders-invoice-prod",
      Key: fileKey,
    });
    // Link 15 minute ke liye valid rahega
    const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    return url;
  } catch (error) {
    console.error("❌ Error generating presigned URL:", error);
    throw error;
  }
};
