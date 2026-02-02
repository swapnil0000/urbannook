import nfcImage from "../model/nfc.image.model.js";

// First-time image upload or add new images
const nfcImageService = async ({ userId, imgUrls }) => {
  if (!userId)
    return { statusCode: 401, success: false, message: "Unauthorized", data: null };

  if (!imgUrls || imgUrls.length === 0)
    return { statusCode: 400, success: false, message: "No images received", data: null };

  if (imgUrls.length < 2 || imgUrls.length > 4)
    return {
      statusCode: 400,
      success: false,
      message: `Min 2 and Max 4 images allowed, received ${imgUrls.length}`,
      data: null,
    };

  const cdnBaseUrl = process.env.AWS_CDN_BASE_URL;
  const imgCdnUrls = imgUrls.map((file) => `${cdnBaseUrl}/${file.key}`);

  // Upsert: first-time create or push new images
  const uploadedImages = await nfcImage.findOneAndUpdate(
    { userId },
    {
      userId,
      $push: { uploadedImagesUrl: { $each: imgCdnUrls } },
      status: "uploaded",
    },
    { upsert: true, new: true }
  );

  return { statusCode: 200, success: true, message: "Images uploaded successfully", data: uploadedImages };
};

// Update existing images
const updateImagesService = async ({ userId, updates }) => {
  const cdnBaseUrl = process.env.AWS_CDN_BASE_URL;

  let userDoc = await nfcImage.findOne({ userId });
  if (!userDoc) return null; // First-time upload handle nahi karta

  let currentImages = userDoc.uploadedImagesUrl || [];

  // ensure length = 4
  while (currentImages.length < 4) currentImages.push(null);

  // replace only specified positions
  updates.forEach(({ index, file }) => {
    if (index >= 0 && index < 4) {
      currentImages[index] = `${cdnBaseUrl}/${file.key}`;
    }
  });

  const updatedDoc = await nfcImage.findOneAndUpdate(
    { userId },
    { uploadedImagesUrl: currentImages, status: "uploaded" },
    { new: true }
  );

  return updatedDoc;
};

export { nfcImageService, updateImagesService };
