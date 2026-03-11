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

  if (obj && obj.bmiLevel) {
    items.push({
      id: 'bmiLevel',
      title: 'BMI 等级',
      content: String(obj.bmiLevel)
    });
  }

  if (items.length === 0 && obj) {
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
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') return;
    if (!app.requireLogin()) return;

    this.loadToday();
  },

  onShow() {
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') return;
    if (!app.requireLogin()) return;
  },

  async loadToday() {
    this.setData({
      loading: true,
      errMsg: '',
      items: []
    });

    try {
      const res = await request.get('/api/recommend/today');
      console.log('[recommend] today res =', res);

      if (Array.isArray(res)) {
        this.setData({
          items: res,
          loading: false
        });
        return;
      }

      if (res && typeof res === 'object') {
        let list = res.list || res.items || res.records || null;

        if (!Array.isArray(list) && res.data) {
          list = res.data.list || res.data.items || res.data.records || null;
        }

        if (Array.isArray(list)) {
          this.setData({
            items: list,
            loading: false
          });
          return;
        }

        const dataObj = res.data && typeof res.data === 'object' ? res.data : res;
        const items = buildItemsFromObj(dataObj);

        this.setData({
          items,
          loading: false
        });
        return;
      }

      this.setData({
        items: [],
        loading: false
      });
    } catch (e) {
      const msg = (e && e.msg) ? e.msg : ((e && e.message) ? e.message : '加载失败');
      console.log('[recommend] load fail', e);
      this.setData({
        loading: false,
        items: [],
        errMsg: msg
      });
    }
  },

  onPullDownRefresh() {
    this.loadToday().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});