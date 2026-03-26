const request = require('../../../utils/request');

Page({
  data: {
    loading: false,
    verifying: false,
    bizType: 'METRIC',
    verifyPassed: false,
    verifyMessage: '',
    list: [],
    currentDetail: null
  },

  onLoad() {
    this.reloadAll();
  },

  async reloadAll() {
    this.setData({
      loading: true
    });

    try {
      const verifyRes = await request.get('/api/block-chain-log/my/verify', {
        bizType: this.data.bizType
      });

      const listRes = await request.get('/api/block-chain-log/my/list', {
        bizType: this.data.bizType
      });

      this.setData({
        verifyPassed: !!verifyRes.passed,
        verifyMessage: verifyRes.message || '',
        list: Array.isArray(listRes) ? listRes.map(item => this.normalizeItem(item)) : []
      });
    } catch (e) {
      console.error('[blockchain] reload fail =', e);
      wx.showToast({
        title: e.msg || e.message || '加载失败',
        icon: 'none'
      });
      this.setData({
        list: [],
        verifyPassed: false,
        verifyMessage: '加载失败，请稍后重试'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  normalizeItem(item) {
    const x = item || {};
    return {
      id: x.id || '',
      bizType: x.bizType || '',
      bizTypeText: x.bizTypeText || '',
      bizId: x.bizId || '',
      action: x.action || '',
      actionText: x.actionText || '',
      dataHash: x.dataHash || '',
      prevHash: x.prevHash || '',
      blockHash: x.blockHash || '',
      createTime: this.formatTime(x.createTime),
      dataHashShort: this.shortHash(x.dataHash),
      prevHashShort: this.shortHash(x.prevHash),
      blockHashShort: this.shortHash(x.blockHash)
    };
  },

  shortHash(text) {
    if (!text) return '-';
    const str = String(text);
    if (str.length <= 20) return str;
    return `${str.slice(0, 10)}...${str.slice(-10)}`;
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    return String(timeStr).replace('T', ' ').replace(/\.\d+$/, '').slice(0, 19);
  },

  changeBizType(e) {
    const bizType = e.currentTarget.dataset.type;
    if (!bizType || bizType === this.data.bizType) {
      return;
    }

    this.setData({
      bizType,
      list: [],
      currentDetail: null
    });

    this.reloadAll();
  },

  async onVerifyTap() {
    this.setData({
      verifying: true
    });

    try {
      const res = await request.get('/api/block-chain-log/my/verify', {
        bizType: this.data.bizType
      });

      this.setData({
        verifyPassed: !!res.passed,
        verifyMessage: res.message || ''
      });

      wx.showToast({
        title: res.passed ? '校验通过' : '校验异常',
        icon: res.passed ? 'success' : 'none'
      });
    } catch (e) {
      console.error('[blockchain] verify fail =', e);
      wx.showToast({
        title: e.msg || e.message || '校验失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        verifying: false
      });
    }
  },

  showDetail(e) {
    const id = Number(e.currentTarget.dataset.id || 0);
    const row = this.data.list.find(item => Number(item.id) === id);
    if (!row) {
      return;
    }

    this.setData({
      currentDetail: row
    });
  },

  closeDetail() {
    this.setData({
      currentDetail: null
    });
  },

  copyHash(e) {
    const text = e.currentTarget.dataset.text || '';
    const label = e.currentTarget.dataset.label || '哈希';

    if (!text) {
      wx.showToast({
        title: '暂无内容可复制',
        icon: 'none'
      });
      return;
    }

    wx.setClipboardData({
      data: String(text),
      success: () => {
        wx.showToast({
          title: `${label}已复制`,
          icon: 'success'
        });
      }
    });
  },

  noop() {}
});