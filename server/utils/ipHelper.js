/**
 * IP地址获取工具
 * 提供可靠的客户端IP地址获取方法
 */

/**
 * 从请求中获取客户端真实IP地址
 *
 * 考虑以下来源（按优先级）：
 * 1. X-Forwarded-For 头部（代理服务器传递的真实IP）
 * 2. X-Real-IP 头部（Nginx等代理服务器设置）
 * 3. req.ip（Express处理后的IP）
 * 4. req.connection.remoteAddress（TCP连接层的IP）
 * 5. req.socket.remoteAddress（Socket层的IP）
 *
 * @param {Object} req - Express请求对象
 * @returns {string|null} 客户端IP地址，无法获取时返回null
 */
function getClientIp(req) {
  // 尝试从X-Forwarded-For获取（可能是逗号分隔的列表，第一个是真实客户端IP）
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }

  // 尝试从X-Real-IP获取
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }

  // 尝试从req.ip获取（需要配置trust proxy）
  if (req.ip) {
    return req.ip;
  }

  // 尝试从connection获取
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }

  // 尝试从socket获取
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }

  // 无法获取IP
  return null;
}

/**
 * 清理IP地址格式
 *
 * 移除IPv6的前缀等
 * 例如: ::ffff:127.0.0.1 -> 127.0.0.1
 *
 * @param {string|null} ip - 原始IP地址
 * @returns {string|null} 清理后的IP地址
 */
function cleanIp(ip) {
  if (!ip) {
    return null;
  }

  // 移除IPv6前缀
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }

  return ip;
}

/**
 * 获取并清理客户端IP地址
 *
 * @param {Object} req - Express请求对象
 * @returns {string|null} 清理后的客户端IP地址
 */
function getCleanClientIp(req) {
  const ip = getClientIp(req);
  return cleanIp(ip);
}

/**
 * 验证IP地址格式是否有效
 *
 * @param {string} ip - IP地址
 * @returns {boolean} 是否为有效的IP地址
 */
function isValidIp(ip) {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // IPv4正则
  const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;

  // IPv6正则（简化版）
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * 判断是否为本地IP地址
 *
 * @param {string} ip - IP地址
 * @returns {boolean} 是否为本地IP
 */
function isLocalIp(ip) {
  if (!ip) {
    return false;
  }

  return ip === 'localhost' ||
         ip === '127.0.0.1' ||
         ip === '::1' ||
         ip.startsWith('192.168.') ||
         ip.startsWith('10.') ||
         ip.startsWith('172.16.');
}

module.exports = {
  getClientIp,
  cleanIp,
  getCleanClientIp,
  isValidIp,
  isLocalIp
};
