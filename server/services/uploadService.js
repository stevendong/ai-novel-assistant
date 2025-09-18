const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { r2Client, BUCKET_NAME, CDN_DOMAIN } = require('../config/cloudflareR2');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class UploadService {
  /**
   * 上传文件到 Cloudflare R2
   * @param {Buffer} fileBuffer 文件缓冲区
   * @param {string} fileName 原始文件名
   * @param {string} contentType 文件类型
   * @param {string} folder 存储文件夹 (avatars, documents, etc.)
   * @returns {Promise<{success: boolean, url: string, key: string, error?: string}>}
   */
  async uploadFile(fileBuffer, fileName, contentType, folder = 'uploads') {
    try {
      // 生成唯一的文件名
      const fileExtension = path.extname(fileName);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      const fileKey = `${folder}/${uniqueFileName}`;

      // 上传文件到 R2
      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: contentType,
        // 设置为公开可读
        ACL: 'public-read',
        // 添加缓存控制
        CacheControl: 'max-age=31536000', // 1年缓存
        // 添加元数据
        Metadata: {
          'original-name': fileName,
          'upload-time': new Date().toISOString()
        }
      });

      await r2Client.send(uploadCommand);

      // 构建文件URL
      let fileUrl;
      if (CDN_DOMAIN) {
        // 使用CDN域名
        fileUrl = `https://${CDN_DOMAIN}/${fileKey}`;
      } else {
        // 使用R2的公开URL
        const bucketDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;
        if (bucketDomain) {
          fileUrl = `https://${bucketDomain}/${fileKey}`;
        } else {
          // 回退到基本URL格式
          fileUrl = `${process.env.CLOUDFLARE_R2_ENDPOINT}/${BUCKET_NAME}/${fileKey}`;
        }
      }

      return {
        success: true,
        url: fileUrl,
        key: fileKey,
        fileName: uniqueFileName,
        originalName: fileName
      };

    } catch (error) {
      console.error('Upload to R2 failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }


  /**
   * 删除文件
   * @param {string} fileKey 文件的key
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteFile(fileKey) {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey
      });

      await r2Client.send(deleteCommand);

      return {
        success: true
      };

    } catch (error) {
      console.error('Delete from R2 failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 生成预签名URL用于临时访问
   * @param {string} fileKey
   * @param {number} expiresIn 过期时间（秒）
   * @returns {Promise<string>}
   */
  async generatePresignedUrl(fileKey, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey
      });

      const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
      return signedUrl;

    } catch (error) {
      console.error('Generate presigned URL failed:', error);
      throw error;
    }
  }

  /**
   * 从URL中提取文件key
   * @param {string} fileUrl
   * @returns {string|null}
   */
  extractKeyFromUrl(fileUrl) {
    try {
      if (!fileUrl) return null;

      // 处理CDN域名的情况
      if (CDN_DOMAIN && fileUrl.includes(CDN_DOMAIN)) {
        return fileUrl.split(`${CDN_DOMAIN}/`)[1];
      }

      // 处理R2公开域名的情况
      const bucketDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;
      if (bucketDomain && fileUrl.includes(bucketDomain)) {
        return fileUrl.split(`${bucketDomain}/`)[1];
      }

      // 处理基本URL格式
      if (fileUrl.includes(`/${BUCKET_NAME}/`)) {
        return fileUrl.split(`/${BUCKET_NAME}/`)[1];
      }

      return null;
    } catch (error) {
      console.error('Extract key from URL failed:', error);
      return null;
    }
  }
}

module.exports = new UploadService();