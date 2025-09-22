const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

/**
 * 检查指定端口是否被占用
 * @param {number} port 端口号
 * @returns {Promise<boolean>} 是否被占用
 */
async function isPortInUse(port) {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    return stdout.trim() !== '';
  } catch (error) {
    // lsof 返回非0退出码表示端口未被占用
    return false;
  }
}

/**
 * 获取占用指定端口的进程ID
 * @param {number} port 端口号
 * @returns {Promise<string[]>} 进程ID数组
 */
async function getPortPids(port) {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    return stdout.trim().split('\n').filter(pid => pid);
  } catch (error) {
    return [];
  }
}

/**
 * 获取进程信息
 * @param {string} pid 进程ID
 * @returns {Promise<object>} 进程信息
 */
async function getProcessInfo(pid) {
  try {
    const { stdout } = await execAsync(`ps -p ${pid} -o pid,ppid,command --no-headers`);
    const parts = stdout.trim().split(/\s+/);
    return {
      pid: parts[0],
      ppid: parts[1],
      command: parts.slice(2).join(' ')
    };
  } catch (error) {
    return null;
  }
}

/**
 * 杀死占用指定端口的进程
 * @param {number} port 端口号
 * @param {boolean} force 是否强制杀死进程
 * @returns {Promise<object>} 操作结果
 */
async function killPortProcesses(port, force = false) {
  const pids = await getPortPids(port);

  if (pids.length === 0) {
    return {
      success: true,
      message: `端口 ${port} 未被占用`,
      killedProcesses: []
    };
  }

  const killedProcesses = [];
  const signal = force ? 'SIGKILL' : 'SIGTERM';

  for (const pid of pids) {
    try {
      const processInfo = await getProcessInfo(pid);
      await execAsync(`kill -${signal} ${pid}`);

      killedProcesses.push({
        pid,
        command: processInfo?.command || 'Unknown',
        signal:'SIGKILL'
      });

      console.log(`✓ 已杀死进程 ${pid} (${processInfo?.command || 'Unknown'})`);
    } catch (error) {
      console.warn(`⚠ 无法杀死进程 ${pid}: ${error.message}`);
    }
  }

  // 等待一小段时间确保进程被杀死
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 验证端口是否已释放
  const stillInUse = await isPortInUse(port);

  return {
    success: !stillInUse,
    message: stillInUse
      ? `端口 ${port} 仍被占用，可能需要强制杀死进程`
      : `端口 ${port} 已成功释放`,
    killedProcesses,
    stillInUse
  };
}

/**
 * 确保端口可用，如果被占用则自动杀死占用进程
 * @param {number} port 端口号
 * @param {object} options 选项
 * @returns {Promise<object>} 操作结果
 */
async function ensurePortAvailable(port, options = {}) {
  const {
    autoKill = true,
    force = false,
    retryCount = 2,
    showProcessInfo = true
  } = options;

  console.log(`🔍 检查端口 ${port} 是否可用...`);

  const inUse = await isPortInUse(port);

  if (!inUse) {
    console.log(`✅ 端口 ${port} 可用`);
    return {
      success: true,
      message: `端口 ${port} 可用`,
      available: true
    };
  }

  if (showProcessInfo) {
    const pids = await getPortPids(port);
    console.log(`⚠ 端口 ${port} 被以下进程占用:`);

    for (const pid of pids) {
      const processInfo = await getProcessInfo(pid);
      console.log(`  PID: ${pid}, 命令: ${processInfo?.command || 'Unknown'}`);
    }
  }

  if (!autoKill) {
    return {
      success: false,
      message: `端口 ${port} 被占用，需要手动处理`,
      available: false
    };
  }

  console.log(`🔧 正在释放端口 ${port}...`);

  let result;
  for (let i = 0; i < retryCount; i++) {
    result = await killPortProcesses(port, force || i > 0);

    if (result.success) {
      console.log(`✅ ${result.message}`);
      return {
        success: true,
        message: result.message,
        available: true,
        killedProcesses: result.killedProcesses
      };
    }

    if (i < retryCount - 1) {
      console.log(`⚠ 重试中... (${i + 1}/${retryCount})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return {
    success: false,
    message: `无法释放端口 ${port}`,
    available: false,
    killedProcesses: result?.killedProcesses || []
  };
}

module.exports = {
  isPortInUse,
  getPortPids,
  getProcessInfo,
  killPortProcesses,
  ensurePortAvailable
};
