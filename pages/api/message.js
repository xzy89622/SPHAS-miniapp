const request = require('../../utils/request');

function unwrapPage(res) {
  if (!res) {
    return {
      records: [],
      total: 0,
      pageNum: 1,
      pageSize: 10
    };
  }

  if (Array.isArray(res)) {
    return {
      records: res,
      total: res.length,
      pageNum: 1,
      pageSize: res.length || 10
    };
  }

  if (Array.isArray(res.records)) {
    return {
      records: res.records,
      total: Number(res.total || res.records.length || 0),
      pageNum: Number(res.current || res.pageNum || 1),
      pageSize: Number(res.size || res.pageSize || 10)
    };
  }

  if (res.data) {
    const d = res.data;
    if (Array.isArray(d.records)) {
      return {
        records: d.records,
        total: Number(d.total || d.records.length || 0),
        pageNum: Number(d.current || d.pageNum || 1),
        pageSize: Number(d.size || d.pageSize || 10)
      };
    }
    if (Array.isArray(d)) {
      return {
        records: d,
        total: d.length,
        pageNum: 1,
        pageSize: d.length || 10
      };
    }
  }

  return {
    records: [],
    total: 0,
    pageNum: 1,
    pageSize: 10
  };
}

function unwrapObj(res) {
  if (!res) return {};
  if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
    return res.data;
  }
  return res;
}

function normalizeMessage(row) {
  const item = row || {};
  return {
    ...item,
    isRead: Number(item.isRead || 0),
    bizId: item.bizId ? Number(item.bizId) : null
  };
}

async function pageMessages(params) {
  const res = await request.get('/api/message/page', Object.assign({
    pageNum: 1,
    pageSize: 10
  }, params || {}));

  const page = unwrapPage(res);
  return {
    ...page,
    records: (page.records || []).map(normalizeMessage)
  };
}

async function unreadCount() {
  const res = await request.get('/api/message/unreadCount');
  if (typeof res === 'number') return res;
  if (res && typeof res === 'object') {
    return Number(
      res.count ||
      res.total ||
      res.unreadCount ||
      res.data ||
      0
    );
  }
  return 0;
}

async function messageDetail(id) {
  const res = await request.get(`/api/message/detail/${id}`);
  return normalizeMessage(unwrapObj(res));
}

async function readMessage(id) {
  return request.post(`/api/message/read/${id}`, {});
}

async function readAllMessages() {
  return request.post('/api/message/readAll', {});
}

module.exports = {
  pageMessages,
  unreadCount,
  messageDetail,
  readMessage,
  readAllMessages
};