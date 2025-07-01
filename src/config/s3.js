require('dotenv').config();
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// AWS S3 configuration from environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

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

    const command = new PutObjectCommand(params);
    const uploadResult = await s3Client.send(command);
    
    // Construct the URL since SDK v3 doesn't return Location directly
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    console.log('File uploaded successfully to S3:', fileUrl);
    return fileUrl;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
};

/**
 * Generate a pre-signed URL for temporary access to a private S3 object
 * @param {string} key - S3 object key
 * @param {number} expirySeconds - URL expiry time in seconds
 * @returns {Promise<string>} - Pre-signed URL
 */
const generateSignedUrl = async (key, expirySeconds = 3600) => {
  const params = {
    Bucket: bucketName,
    Key: key
  };

  const command = new GetObjectCommand(params);
  return await getSignedUrl(s3Client, command, { expiresIn: expirySeconds });
};

module.exports = {
  s3Client,
  bucketName,
  uploadToS3,
  getSignedUrl: generateSignedUrl
};