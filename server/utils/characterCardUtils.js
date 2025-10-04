const sharp = require('sharp');

/**
 * SillyTavern 角色卡工具函数
 * 用于处理 PNG 图片中的角色卡元数据
 */

/**
 * 从 PNG 图片中提取 SillyTavern 角色卡数据
 * @param {Buffer} pngBuffer - PNG 图片的 Buffer
 * @returns {Promise<Object|null>} 角色卡数据对象，如果不存在则返回 null
 */
async function extractCharacterCardFromPNG(pngBuffer) {
  try {
    return new Promise((resolve, reject) => {
      // 手动解析 PNG chunks 来查找 tEXt chunk
      let offset = 8; // 跳过 PNG signature
      let charaData = null;

      while (offset < pngBuffer.length) {
        // 读取 chunk 长度
        if (offset + 8 > pngBuffer.length) break;

        const chunkLength = pngBuffer.readUInt32BE(offset);
        const chunkType = pngBuffer.toString('ascii', offset + 4, offset + 8);

        // 检查是否是 tEXt chunk
        if (chunkType === 'tEXt') {
          const chunkData = pngBuffer.slice(offset + 8, offset + 8 + chunkLength);

          // tEXt chunk 格式: keyword\0text
          const nullIndex = chunkData.indexOf(0);
          if (nullIndex !== -1) {
            const keyword = chunkData.toString('latin1', 0, nullIndex);
            const text = chunkData.toString('latin1', nullIndex + 1);

            // 查找 'chara' 关键字
            if (keyword === 'chara') {
              charaData = text;
              break;
            }
          }
        }

        // 移动到下一个 chunk (长度 + 类型 + 数据 + CRC)
        offset += 12 + chunkLength;
      }

      if (charaData) {
        try {
          // SillyTavern 使用 base64 编码存储数据
          const decodedData = Buffer.from(charaData, 'base64').toString('utf-8');
          const characterData = JSON.parse(decodedData);
          resolve(characterData);
        } catch (parseErr) {
          console.error('Failed to parse character data:', parseErr);
          console.error('Raw chara data:', charaData.substring(0, 100));
          resolve(null);
        }
      } else {
        console.log('No chara chunk found in PNG');
        resolve(null);
      }
    });
  } catch (error) {
    console.error('Error extracting character card:', error);
    return null;
  }
}

/**
 * 将角色卡数据嵌入到 PNG 图片中
 * @param {Buffer} pngBuffer - 原始 PNG 图片的 Buffer
 * @param {Object} characterData - 角色卡数据对象
 * @returns {Promise<Buffer>} 包含角色卡数据的新 PNG Buffer
 */
async function embedCharacterCardToPNG(pngBuffer, characterData) {
  try {
    // 将角色数据转为 JSON 并 base64 编码
    const jsonData = JSON.stringify(characterData);
    const base64Data = Buffer.from(jsonData).toString('base64');

    // 创建 tEXt chunk
    const keyword = 'chara';

    // tEXt chunk 数据 = keyword + null byte + text
    const chunkData = Buffer.concat([
      Buffer.from(keyword, 'latin1'),
      Buffer.from([0]), // null separator
      Buffer.from(base64Data, 'latin1')
    ]);

    // 创建完整的 tEXt chunk
    const chunkLength = Buffer.alloc(4);
    chunkLength.writeUInt32BE(chunkData.length);

    const chunkType = Buffer.from('tEXt', 'ascii');

    // 计算 CRC
    const crcData = Buffer.concat([chunkType, chunkData]);
    const crc = calculateCRC(crcData);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc);

    const textChunk = Buffer.concat([chunkLength, chunkType, chunkData, crcBuffer]);

    // 在 PNG 中插入 tEXt chunk (在 IDAT 之前)
    return insertChunkBeforeIDAT(pngBuffer, textChunk);
  } catch (error) {
    console.error('Error embedding character card:', error);
    throw error;
  }
}

/**
 * 计算 CRC32 校验和
 * @param {Buffer} data
 * @returns {number}
 */
function calculateCRC(data) {
  let crc = 0xFFFFFFFF;

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc >>>= 1;
      }
    }
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * 在 IDAT chunk 之前插入新的 chunk
 * @param {Buffer} pngBuffer
 * @param {Buffer} newChunk
 * @returns {Buffer}
 */
function insertChunkBeforeIDAT(pngBuffer, newChunk) {
  const chunks = [];
  let offset = 8; // 跳过 PNG signature
  let idatFound = false;

  // PNG signature
  chunks.push(pngBuffer.slice(0, 8));

  while (offset < pngBuffer.length) {
    if (offset + 8 > pngBuffer.length) break;

    const chunkLength = pngBuffer.readUInt32BE(offset);
    const chunkType = pngBuffer.toString('ascii', offset + 4, offset + 8);
    const fullChunkLength = 12 + chunkLength; // length + type + data + CRC
    const chunk = pngBuffer.slice(offset, offset + fullChunkLength);

    // 在第一个 IDAT 之前插入新 chunk
    if (chunkType === 'IDAT' && !idatFound) {
      chunks.push(newChunk);
      idatFound = true;
    }

    chunks.push(chunk);
    offset += fullChunkLength;
  }

  // 如果没有找到 IDAT，在末尾插入 (IEND 之前)
  if (!idatFound && chunks.length > 0) {
    const lastChunk = chunks.pop();
    chunks.push(newChunk);
    chunks.push(lastChunk);
  }

  return Buffer.concat(chunks);
}

/**
 * 将系统角色数据转换为 SillyTavern V2 格式
 * @param {Object} character - 系统角色对象
 * @returns {Object} SillyTavern V2 格式的角色卡数据
 */
function convertToSillyTavernFormat(character) {
  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: character.name || '',
      description: character.description || '',
      personality: character.personality || '',
      scenario: character.background || '',
      first_mes: character.firstMessage || '',
      mes_example: character.messageExample || '',

      // 创建者注释：合并价值观、恐惧和技能
      creator_notes: [
        character.values ? `核心价值观: ${character.values}` : '',
        character.fears ? `恐惧与弱点: ${character.fears}` : '',
        character.skills ? `技能与能力: ${character.skills}` : '',
      ].filter(Boolean).join('\n\n'),

      // 系统提示词
      system_prompt: character.systemPrompt || '',
      post_history_instructions: character.postHistoryInstructions || '',

      // 备用问候语
      alternate_greetings: character.alternateGreetings ?
        JSON.parse(character.alternateGreetings) : [],

      // 角色书
      character_book: character.characterBook ?
        JSON.parse(character.characterBook) : undefined,

      // 标签
      tags: character.tags ? JSON.parse(character.tags) : [],

      // 创作者和版本
      creator: character.creator || '',
      character_version: character.characterVersion || '1.0',

      // 扩展数据（保存额外字段）
      extensions: {
        // 保存系统特有字段
        age: character.age,
        identity: character.identity,
        appearance: character.appearance,
        relationships: character.relationships ?
          (typeof character.relationships === 'string' ? JSON.parse(character.relationships) : character.relationships) :
          null,
      }
    }
  };
}

/**
 * 将 SillyTavern 格式转换为系统角色数据（提取所有原始数据）
 * @param {Object} cardData - SillyTavern 角色卡数据
 * @returns {Object} 包含原始数据和基础提取的对象
 */
function convertFromSillyTavernFormat(cardData) {
  const data = cardData.data || cardData; // 兼容 V1 和 V2 格式

  // 提取所有可用的原始数据
  const rawData = {
    // 基础字段
    name: data.name || '',
    description: data.description || '',
    personality: data.personality || '',
    scenario: data.scenario || '',

    // 消息相关
    first_mes: data.first_mes || '',
    mes_example: data.mes_example || '',
    alternate_greetings: data.alternate_greetings || [],

    // 提示词
    system_prompt: data.system_prompt || '',
    post_history_instructions: data.post_history_instructions || '',
    creator_notes: data.creator_notes || '',

    // 元数据
    tags: data.tags || [],
    creator: data.creator || '',
    character_version: data.character_version || '',

    // 角色书
    character_book: data.character_book || null,

    // 扩展数据
    extensions: data.extensions || {},
  };

  // 返回包含原始数据的对象，供 AI 解析
  return {
    // 保存完整原始数据供 AI 分析
    _rawData: rawData,

    // 基础映射（作为后备）
    name: data.name || '',
    description: data.description || '',
    personality: data.personality || '',
    background: data.scenario || '',

    // SillyTavern 特有字段
    firstMessage: data.first_mes || '',
    messageExample: data.mes_example || '',
    alternateGreetings: data.alternate_greetings ?
      JSON.stringify(data.alternate_greetings) : null,
    systemPrompt: data.system_prompt || '',
    postHistoryInstructions: data.post_history_instructions || '',
    tags: data.tags ? JSON.stringify(data.tags) : null,
    creator: data.creator || '',
    characterVersion: data.character_version || '1.0',
    characterBook: data.character_book ?
      JSON.stringify(data.character_book) : null,

    // 从扩展数据中提取
    age: data.extensions?.age || '',
    identity: data.extensions?.identity || '',
    appearance: data.extensions?.appearance || '',
    values: data.extensions?.values || '',
    fears: data.extensions?.fears || '',
    skills: data.extensions?.skills || '',
    relationships: data.extensions?.relationships ?
      (typeof data.extensions.relationships === 'string' ?
        data.extensions.relationships :
        JSON.stringify(data.extensions.relationships)) : null,

    // 保存原始卡片数据
    originalCardData: JSON.stringify(cardData),
  };
}

/**
 * 验证是否为有效的 SillyTavern 角色卡
 * @param {Object} cardData - 角色卡数据
 * @returns {boolean} 是否有效
 */
function isValidCharacterCard(cardData) {
  if (!cardData) return false;

  // 检查 V2 格式
  if (cardData.spec === 'chara_card_v2' && cardData.data) {
    return !!(cardData.data.name);
  }

  // 检查 V1 格式
  return !!(cardData.name);
}

/**
 * 创建默认角色头像（如果没有头像）
 * @param {string} characterName - 角色名称
 * @returns {Promise<Buffer>} 默认头像 PNG Buffer
 */
async function createDefaultAvatar(characterName) {
  const initial = (characterName || '?').charAt(0).toUpperCase();
  const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#87d068'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  // 创建一个简单的 400x400 的纯色背景图片，中间显示首字母
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="${color}"/>
      <text x="50%" y="50%" font-size="200" font-family="Arial"
            text-anchor="middle" dominant-baseline="central" fill="white">
        ${initial}
      </text>
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}

module.exports = {
  extractCharacterCardFromPNG,
  embedCharacterCardToPNG,
  convertToSillyTavernFormat,
  convertFromSillyTavernFormat,
  isValidCharacterCard,
  createDefaultAvatar,
};
