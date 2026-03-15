const { request } = require('../../../utils/request');

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatTime(value) {
  if (!value) return '';
  const text = String(value).replace('T', ' ');
  const date = new Date(text.replace(/-/g, '/'));
  if (Number.isNaN(date.getTime())) {
    return text.slice(0, 16);
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function buildSummary(item) {
  const text =
    item.content ||
    item.description ||
    item.detail ||
    item.remark ||
    '';

  const plain = String(text).replace(/\s+/g, ' ').trim();
  if (!plain) return '';

  return plain.length > 40 ? `${plain.slice(0, 40)}...` : plain;
}

function parseStatus(item) {
  const raw = item.status;
  const status = raw == null ? '' : String(raw).trim().toUpperCase();

  // 已处理
  if (
    raw === 1 ||
    raw === '1' ||
    status === 'DONE' ||
    status === 'PROCESSED' ||
    status === 'CLOSED'
  ) {
    return {
      uiStatusText: '已处理',
      uiStatusClass: 'done',
      uiProgress: 100,
      uiProgressText: '处理流程已完成'
    };
  }

  // 未通过 / 驳回
  if (
    raw === 2 ||
    raw === '2' ||
    status === 'REJECT' ||
    status === 'REJECTED'
  ) {
    return {
      uiStatusText: '未通过',
      uiStatusClass: 'reject',
      uiProgress: 100,
      uiProgressText: '反馈已结束，请查看处理说明'
    };
  }

  // 待处理 / 处理中
  if (
    status === 'OPEN' ||
    status === 'PENDING' ||
    status === 'WAITING' ||
    status === ''
  ) {
    return {
      uiStatusText: '待处理',
      uiStatusClass: 'pending',
      uiProgress: 45,
      uiProgressText: '反馈已提交，等待管理员处理'
    };
  }

  return {
    uiStatusText: '处理中',
    uiStatusClass: 'pending',
    uiProgress: 65,
    uiProgressText: '反馈正在处理中，请耐心等待'
  };
}

function parseType(item) {
  const text = item.typeName || item.categoryName || item.type || '';
  if (!text) return '问题反馈';
  return text;
}

function enhanceItem(item) {
  const statusInfo = parseStatus(item);

  return {
    ...item,
    ...statusInfo,
    uiTime: formatTime(item.createTime || item.submitTime || item.updateTime),
    uiSummary: buildSummary(item),
    uiTypeText: parseType(item),
    uiProgressStyle: `width:${statusInfo.uiProgress}%;`
  };
}

Page({
  data: {
    list: [],
    loading: false,
    firstLoaded: false,
    pendingCount: 0,
    doneCount: 0
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

      const res = await request({
        url: '/api/feedback/my',
        method: 'GET'
      });

      const realList = Array.isArray(res)
        ? res
        : (res && res.data)
          ? res.data
          : (res && res.records)
            ? res.records
            : [];

      const list = (realList || []).map(enhanceItem);

      const pendingCount = list.filter(item => item.uiStatusClass === 'pending').length;
      const doneCount = list.filter(item => item.uiStatusClass === 'done').length;

      this.setData({
        list,
        pendingCount,
        doneCount,
        loading: false,
        firstLoaded: true
      });
    } catch (e) {
      console.error('[feedback list] load fail:', e);
      this.setData({
        loading: false,
        firstLoaded: true
      });

      wx.showToast({
        title: '加载失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      if (fromPullDown) wx.stopPullDownRefresh();
    }
  },

  goCreate() {
    wx.navigateTo({
      url: '/pages/feedback/submit/submit'
    });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/feedback/detail/detail?id=${id}`
    });
  }
});