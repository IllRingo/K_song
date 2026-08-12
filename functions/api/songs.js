export async function onRequestGet(context) {
  const { FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_APP_TOKEN, FEISHU_TABLE_ID } = context.env;

  try {
    // 1. 获取飞书 token
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET })
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.tenant_access_token;

    // 2. 获取多维表格数据 (默认拉取前100条，如需更多需分页)
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records?page_size=100`;
    const recordRes = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const recordData = await recordRes.json();

    if (recordData.code !== 0) {
      throw new Error(recordData.msg || '飞书数据获取失败');
    }

    // 3. 清洗数据 (字段名必须与飞书多维表格完全一致)
    const cleanData = recordData.data.items.map(item => {
      const f = item.fields;
      return {
        name: f['歌曲名'] || '未知歌曲',
        artist: f['歌手名'] || '未知歌手',
        isOriginal: f['是否原唱'] || '原唱',
        reason: f['推荐理由'] || '',
        scene: f['适用场景'] || '',
        recommender: f['推荐人'] || '神秘人'
      };
    });

    return new Response(JSON.stringify({ code: 0, data: cleanData }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ code: -1, msg: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}