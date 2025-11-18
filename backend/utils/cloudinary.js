import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config({});

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

// During tests we prefer not to call the real Cloudinary service.
// When running under NODE_ENV=test, export a small shim that returns
// a deterministic secure_url so tests don't depend on network.
let cloudinaryExport = cloudinary;
if (String(process.env.NODE_ENV || '').toLowerCase() === 'test') {
    cloudinaryExport = {
        uploader: {
            upload: async (fileUri) => {
                return { secure_url: 'http://example.com/test-image.png' };
            }
        }
    };
}

export default cloudinaryExport;