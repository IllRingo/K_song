const fetch = require('node-fetch');

// 从 Vercel 环境变量中读取密钥，保证安全
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const APP_TOKEN = process.env.FEISHU_APP_TOKEN;
const TABLE_ID = process.env.FEISHU_TABLE_ID;

// 获取飞书 tenant_access_token
async function getToken() {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
  });
  const data = await res.json();
  return data.tenant_access_token;
}

// Vercel Serverless 函数入口
module.exports = async (req, res) => {
  try {
    const token = await getToken();
    // 获取多维表格记录 (每次最多100条，如果歌单超过100首，需要分页，这里先拉第一页)
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records?page_size=100`;
    
    const recordRes = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const recordData = await recordRes.json();

    if (recordData.code !== 0) {
      throw new Error(recordData.msg || '获取飞书数据失败');
    }

    // 清洗数据：把飞书返回的复杂结构，变成前端需要的简单结构
    const cleanData = recordData.data.items.map(item => {
      const f = item.fields;
      return {
        name: f['歌曲名'] || f['song_name'] || '未知歌曲',
        artist: f['歌手名'] || f['artist'] || '未知歌手',
        isOriginal: f['是否原唱'] || f['original'] || '原唱',
        reason: f['推荐理由'] || f['reason'] || '',
        scene: f['适用场景'] || f['scene'] || '',
        versionNote: f['补充版本说明'] || f['version_note'] || '',
        platform: f['音乐平台'] || 'qq,netease' // 假设表格里填的是逗号分隔的英文
      };
    });

    // 设置允许跨域，返回干净的数据给前端
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ code: 0, data: cleanData });
    
  } catch (error) {
    res.status(500).json({ code: -1, msg: error.message });
  }
};