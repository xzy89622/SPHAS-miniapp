// pages/challenge/list/list.js
const api = require('../../api/challenge.js');

Page({
  data: {
    tab: 'all',
    loading: false,
    errMsg: '',
    allList: [],
    myList: []
  },

  onLoad() {
    this.loadAll();
  },

  onShow() {
    this.loadAll();
  },

  onPullDownRefresh() {
    this.loadAll().finally(() => wx.stopPullDownRefresh());
  },

  async loadAll() {
    this.setData({ loading: true, errMsg: '' });

    try {
      const [allPage, myList] = await Promise.all([
        api.listChallenges(),
        api.myChallenges()
      ]);

      const allList = allPage.records || [];
      console.log('[challenge] allList =', allList);
      console.log('[challenge] myList =', myList);

      this.setData({
        allList: Array.isArray(allList) ? allList : [],
        myList: Array.isArray(myList) ? myList : []
      });
    } catch (e) {
      console.log('[challenge] loadAll fail', e);
      this.setData({ errMsg: e.msg || '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/challenge/detail/detail?id=${id}`
    });
  }
});