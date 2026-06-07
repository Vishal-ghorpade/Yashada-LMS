import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary if credentials are provided in the environment
const hasCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

/**
 * Generates upload parameters for the frontend player.
 * If Cloudinary credentials are set, it returns a signed request signature.
 * Otherwise, it falls back to a local stream endpoint.
 */
export const getUploadUrl = async (filename, contentType) => {
  if (hasCloudinary) {
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Signed parameters for video uploads
    const paramsToSign = {
      timestamp,
      folder: 'yashada_videos'
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return {
      success: true,
      provider: 'cloudinary',
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder: 'yashada_videos'
    };
  }

  // Local development fallback
  const uniqueId = Math.random().toString(36).substring(2, 15);
  const sanitizedName = filename.replace(/[^a-zA-Z0-9.]/g, '_');
  const key = `uploads/${uniqueId}_${sanitizedName}`;

  const apiURL = process.env.VITE_API_URL 
    ? process.env.VITE_API_URL.replace('/api', '') 
    : 'http://localhost:5000';

  return {
    success: true,
    provider: 'local',
    uploadUrl: `${apiURL}/api/videos/upload-local?key=${encodeURIComponent(key)}`,
    videoUrl: `${apiURL}/${key}`,
    key
  };
};

/**
 * Saves a binary buffer stream to local disk (useful for the local upload fallback).
 */
export const saveLocalFile = async (req, key) => {
  return new Promise((resolve, reject) => {
    // Resolve absolute path
    const uploadPath = path.join(process.cwd(), 'public', key);
    const dir = path.dirname(uploadPath);

    // Create directories if they don't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const writeStream = fs.createWriteStream(uploadPath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      resolve({
        success: true,
        filePath: `/public/${key}`,
        url: `/${key}`
      });
    });

    writeStream.on('error', (err) => {
      reject(err);
    });
  });
};
