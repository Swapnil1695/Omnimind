const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// File upload configuration
const uploadConfig = {
  allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt', 'json'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  transformations: {
    image: {
      quality: 'auto',
      fetch_format: 'auto'
    },
    document: {
      flags: 'attachment'
    }
  }
};

// Upload file to Cloudinary
const uploadToCloudinary = async (file, options = {}) => {
  try {
    const uploadOptions = {
      resource_type: 'auto',
      folder: options.folder || 'omnimind',
      ...options
    };

    const result = await cloudinary.uploader.upload(file.path, uploadOptions);
    
    return {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at,
      resource_type: result.resource_type
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('File upload failed');
  }
};

// Delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('File deletion failed');
  }
};

// Generate image transformations
const generateImageUrl = (publicId, transformations = {}) => {
  const defaultTransformations = {
    quality: 'auto',
    fetch_format: 'auto'
  };

  const mergedTransformations = { ...defaultTransformations, ...transformations };
  
  return cloudinary.url(publicId, {
    ...mergedTransformations,
    secure: true
  });
};

// Get resource info
const getResourceInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary resource info error:', error);
    throw new Error('Failed to get resource info');
  }
};

// Create upload preset (admin only)
const createUploadPreset = async (presetName, settings = {}) => {
  try {
    const result = await cloudinary.api.create_upload_preset({
      name: presetName,
      folder: 'omnimind',
      allowed_formats: uploadConfig.allowedFormats.join(','),
      max_file_size: uploadConfig.maxFileSize,
      ...settings
    });
    
    return result;
  } catch (error) {
    console.error('Cloudinary create preset error:', error);
    throw new Error('Failed to create upload preset');
  }
};

module.exports = {
  cloudinary,
  uploadConfig,
  uploadToCloudinary,
  deleteFromCloudinary,
  generateImageUrl,
  getResourceInfo,
  createUploadPreset
};