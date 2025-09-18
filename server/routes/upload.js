const express = require('express');
const { requireAuth } = require('../middleware/auth');
const uploadService = require('../services/uploadService');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// TODO: 在需要时添加其他上传功能

module.exports = router;