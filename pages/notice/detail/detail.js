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

function detectNoticeType(title) {
  const t = String(title || '');

  if (t.includes('风险预警') || t.includes('高风险') || t.includes('预警')) {
    return {
      uiTag: '风险提醒',
      uiTagClass: 'tag-risk',
      uiTypeClass: 'notice-risk',
      uiTip: '这是一条健康风险相关公告，请尽快查看并结合健康记录、评估与推荐内容及时处理。'
    };
  }

  if (t.includes('维护') || t.includes('更新') || t.includes('升级') || t.includes('修复')) {
    return {
      uiTag: '系统通知',
      uiTagClass: 'tag-maintain',
      uiTypeClass: 'notice-maintain',
      uiTip: '这是一条系统维护或更新类公告，建议关注具体影响范围与处理说明。'
    };
  }

  return {
    uiTag: '公告',
    uiTagClass: 'tag-normal',
    uiTypeClass: 'notice-normal',
    uiTip: '这是一条普通系统公告，请阅读完整内容。'
  };
}

function enhanceNotice(item) {
  const info = detectNoticeType(item && item.title);
  return {
    ...(item || {}),
    uiTag: info.uiTag,
    uiTagClass: info.uiTagClass,
    uiTypeClass: info.uiTypeClass,
    uiTip: info.uiTip,
    uiTime: formatTime(item && (item.createTime || item.publishTime || item.updateTime))
  };
}

Page({
  data: {
    id: '',
    loading: true,
    errorMsg: '',
    notice: {}
  },

  onLoad(options) {
    const id = options && options.id ? options.id : '';
    this.setData({ id }, () => {
      this.loadDetail();
    });
  },

  async loadDetail() {
    if (!this.data.id) {
      this.setData({
        loading: false,
        errorMsg: '缺少公告 ID'
      });
      return;
    }

    try {
      this.setData({
        loading: true,
        errorMsg: '',
        notice: {}
      });

      const res = await request({
        url: `/api/notice/${this.data.id}`,
        method: 'GET'
      });

      const data = (res && res.data) ? res.data : res;
      const notice = enhanceNotice(data || {});

      this.setData({
        loading: false,
        notice
      });
    } catch (e) {
      console.error('[notice detail] load fail:', e);
      this.setData({
        loading: false,
        errorMsg: (e && e.msg) || (e && e.message) || '加载失败，请稍后重试'
      });
    }
  }
});