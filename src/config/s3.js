require('dotenv').config();
const AWS = require('aws-sdk');

// AWS S3 configuration from environment variables
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Create S3 instance
const s3 = new AWS.S3();

// S3 bucket name
const bucketName = process.env.AWS_S3_BUCKET;

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name
 * @param {string} contentType - File content type
 * @returns {Promise<string>} - S3 file URL
 */
const uploadToS3 = async (fileBuffer, fileName, contentType) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: 'private' // Use private access for security
    };

    const uploadResult = await s3.upload(params).promise();
    console.log('File uploaded successfully to S3:', uploadResult.Location);
    return uploadResult.Location;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
};

/**
 * Generate a pre-signed URL for temporary access to a private S3 object
 * @param {string} key - S3 object key
 * @param {number} expirySeconds - URL expiry time in seconds
 * @returns {string} - Pre-signed URL
 */
const getSignedUrl = (key, expirySeconds = 3600) => {
  const params = {
    Bucket: bucketName,
    Key: key,
    Expires: expirySeconds
  };

  return s3.getSignedUrl('getObject', params);
};

module.exports = {
  s3,
  bucketName,
  uploadToS3,
  getSignedUrl
};