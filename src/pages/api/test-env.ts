import type { NextApiRequest, NextApiResponse } from 'next';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('CLOUDINARY_CLOUD_NAME', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('CLOUDINARY_API_KEY', process.env.CLOUDINARY_API_KEY);
  console.log('CLOUDINARY_API_SECRET', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');
  res.status(200).json({
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET',
  });
}
