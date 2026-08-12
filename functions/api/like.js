export async function onRequestPost(context) {
  const { request, env } = context;
  const { FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_APP_TOKEN, FEISHU_TABLE_ID } = env;

  try {
    const { recordId } = await request.json();

    // 1. 获取 token
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET })
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.tenant_access_token;

    // 2. 先获取当前这首歌的记录，看看现在喜欢数是多少
    const getUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records/${recordId}`;
    const getRes = await fetch(getUrl, { headers: { 'Authorization': `Bearer ${token}` } });
    const getData = await getRes.json();
    
    if (getData.code !== 0) throw new Error('找不到该歌曲记录');
    
    const currentLikes = parseInt(getData.data.fields['喜欢']) || 0;
    const newLikes = currentLikes + 1;

    // 3. 更新飞书里的喜欢数
    const updateUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records/${recordId}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { "喜欢": newLikes } })
    });
    const updateData = await updateRes.json();

    if (updateData.code !== 0) throw new Error('更新喜欢数失败');

    return new Response(JSON.stringify({ code: 0, likes: newLikes }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ code: -1, msg: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}