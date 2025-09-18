const { S3Client } = require('@aws-sdk/client-s3');

// Cloudflare R2 配置
const r2Config = {
  region: 'auto', // R2 使用 'auto' 作为 region
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT, // 类似: https://[account-id].r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // R2 要求使用 path style
};

// 创建 S3 客户端（R2 兼容 S3 API）
const r2Client = new S3Client(r2Config);

// R2 存储桶名称
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'ai-novel-assistant';

// CDN 域名（可选，用于提供更快的访问速度）
const CDN_DOMAIN = process.env.CLOUDFLARE_R2_CDN_DOMAIN;

module.exports = {
  r2Client,
  BUCKET_NAME,
  CDN_DOMAIN,
  r2Config
};