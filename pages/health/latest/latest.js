const { request } = require('../../../utils/request');

function toNumber(val) {
  if (val === null || val === undefined || val === '') return NaN;
  const num = Number(val);
  return Number.isFinite(num) ? num : NaN;
}

function calcBmi(heightCm, weightKg) {
  const h = toNumber(heightCm);
  const w = toNumber(weightKg);

  if (!h || !w || h <= 0 || w <= 0) {
    return { bmiText: '', bmiLevel: '' };
  }

  const heightM = h / 100;
  const bmi = w / (heightM * heightM);
  const bmiText = bmi.toFixed(1);

  let bmiLevel = '';
  if (bmi < 18.5) {
    bmiLevel = '偏瘦';
  } else if (bmi < 24) {
    bmiLevel = '正常';
  } else if (bmi < 28) {
    bmiLevel = '偏高';
  } else {
    bmiLevel = '肥胖风险';
  }

  return { bmiText, bmiLevel };
}

function enrichItem(item) {
  const bmiInfo = calcBmi(item.heightCm, item.weightKg);
  return {
    ...item,
    bmiText: bmiInfo.bmiText,
    bmiLevel: bmiInfo.bmiLevel
  };
}

Page({
  data: {
    loading: false,
    list: []
  },

  onLoad() {
    this.loadList();
  },

  onShow() {
    this.loadList();
  },

  onPullDownRefresh() {
    this.loadList(true);
  },

  async loadList(fromPullDown = false) {
    try {
      this.setData({ loading: true });

      const list = await request({
        url: '/api/health/latest',
        method: 'GET',
        data: { limit: 7 }
      });

      const safeList = Array.isArray(list) ? list.map(enrichItem) : [];

      this.setData({
        list: safeList
      });
    } catch (e) {
      console.error('[health latest] load fail:', e);
      wx.showToast({
        title: '加载失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
      if (fromPullDown) wx.stopPullDownRefresh();
    }
  },

  goRecord() {
    wx.navigateTo({
      url: '/pages/health/record/record'
    });
  },

  edit(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/pages/health/record/record?recordDate=${date}`
    });
  }
});