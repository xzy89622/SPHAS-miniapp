// pages/recommend/today/index.js
// ✅ 兼容后端返回对象（diet/sport/reason）或数组（items/list）

const request = require('../../../utils/request');

function buildItemsFromObj(obj) {
  const items = [];

  if (obj && obj.diet) {
    items.push({
      id: 'diet',
      title: '饮食方案',
      content: obj.diet.title || obj.diet.name || obj.diet.description || obj.diet.content || JSON.stringify(obj.diet)
    });
  }

  if (obj && obj.sport) {
    items.push({
      id: 'sport',
      title: '运动方案',
      content: obj.sport.title || obj.sport.name || obj.sport.description || obj.sport.content || JSON.stringify(obj.sport)
    });
  }

  if (obj && obj.reason) {
    items.push({
      id: 'reason',
      title: '推荐理由',
      content: obj.reason
    });
  }

  if (items.length === 0 && obj) {
    // ✅ 兜底：对象里没有 diet/sport/reason，就把整个对象展示出来
    items.push({
      id: 'raw',
      title: '推荐内容',
      content: JSON.stringify(obj)
    });
  }

  return items;
}

Page({
  data: {
    loading: true,
    items: [],
    errMsg: ''
  },

  onLoad() {
    this.loadToday();
  },

  async loadToday() {
    this.setData({ loading: true, errMsg: '' });

    try {
      // ✅ 你后端现在 GET/POST 都支持了，优先 GET
      const res = await request.get('/api/recommend/today');
      console.log('[recommend] today res =', res);

      // 1) 后端直接返回数组
      if (Array.isArray(res)) {
        this.setData({ items: res, loading: false });
        return;
      }

      // 2) 后端返回 {list/items/records}
      if (res && typeof res === 'object') {
        let list = res.list || res.items || res.records || null;
        if (!Array.isArray(list) && res.data) {
          list = res.data.list || res.data.items || res.data.records || null;
        }

        // 2.1 如果确实是列表
        if (Array.isArray(list)) {
          this.setData({ items: list, loading: false });
          return;
        }

        // 2.2 否则把对象转换成卡片列表展示
        const items = buildItemsFromObj(res);
        this.setData({ items, loading: false });
        return;
      }

      // 3) 其他情况当空
      this.setData({ items: [], loading: false });
    } catch (e) {
      const msg = (e && e.msg) ? e.msg : '加载失败';
      console.log('[recommend] load fail', e);
      this.setData({ loading: false, items: [], errMsg: msg });
    }
  },

  onPullDownRefresh() {
    this.loadToday().finally(() => wx.stopPullDownRefresh());
  }
});