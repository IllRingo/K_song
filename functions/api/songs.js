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

    // 2. 循环获取所有数据 (支持分页，防止歌单超过100首丢失)
    let allItems = [];
    let pageToken = undefined;
    do {
      let url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records?page_size=100`;
      if (pageToken) url += `&page_token=${pageToken}`;
      
      const recordRes = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const recordData = await recordRes.json();
      
      if (recordData.code !== 0) throw new Error(recordData.msg || '飞书数据获取失败');
      
      allItems = allItems.concat(recordData.data.items);
      pageToken = recordData.data.has_more ? recordData.data.page_token : undefined;
    } while (pageToken);

    // 3. 清洗数据
    const cleanData = allItems.map(item => {
      const f = item.fields;
      return {
        id: item.record_id, // 保留记录ID，用于点赞接口
        name: f['歌曲名'] || '未知歌曲',
        artist: f['歌手名'] || '未知歌手',
        isOriginal: f['是否原唱'] || '原唱',
        reason: f['推荐理由'] || '',
        scene: f['适用场景'] || '',
        recommender: f['推荐人'] || '神秘人',
        likes: parseInt(f['喜欢']) || 0, // 读取喜欢数
        createdAt: item.created_time || 0 // 读取创建时间戳(毫秒)
      };
    });

    return new Response(JSON.stringify({ code: 0, data: cleanData }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ code: -1, msg: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}