const { v4: uuidv4 } = require('uuid');
const { uploadToS3 } = require('../config/s3');

/**
 * Process and upload a Telegram photo to S3
 * @param {Object} bot - Telegram bot instance
 * @param {string} fileId - Telegram file ID
 * @param {string} userId - User's Telegram ID
 * @returns {Promise<Object>} - Upload result with URL and key
 */
const uploadTelegramPhoto = async (bot, fileId, userId) => {
  try {
    // Get file path from Telegram
    const file = await bot.getFile(fileId);
    const fileLink = file.file_path;
    
    // Download file buffer from Telegram
    const fileBuffer = await downloadFileFromTelegram(bot, fileLink);
    
    // Generate unique filename
    const fileName = `verification/${userId}/${uuidv4()}.jpg`;
    
    // Upload to S3
    const fileUrl = await uploadToS3(fileBuffer, fileName, 'image/jpeg');
    
    return {
      url: fileUrl,
      key: fileName,
      success: true
    };
  } catch (error) {
    console.error('Error uploading photo to S3:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Download file from Telegram as buffer
 * @param {Object} bot - Telegram bot instance
 * @param {string} filePath - Telegram file path
 * @returns {Promise<Buffer>} - File buffer
 */
const downloadFileFromTelegram = async (bot, filePath) => {
  try {
    // Get file download URL from Telegram
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${filePath}`;
    
    // Fetch file as buffer
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error downloading file from Telegram:', error);
    throw error;
  }
};

module.exports = {
  uploadTelegramPhoto
};