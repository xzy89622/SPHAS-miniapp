// utils/request.js
// 目标：
// 1) 所有请求自动带 token（Bearer）
// 2) 兼容后端 code/msg 结构（0/200 都算成功）
// 3) 失败时把原因打印出来，页面不再只显示“加载失败”
// 4) ✅ 兼容旧代码：const { request } = require('.../utils/request')

const KEY_BASE_URL = 'BASE_URL';
const TIMEOUT = 15000;

function normalizeBaseUrl(url) {
  if (!url) return '';
  return String(url).trim().replace(/\/+$/, '');
}

function getBaseUrl() {
  const stored = normalizeBaseUrl(wx.getStorageSync(KEY_BASE_URL));
  if (stored) return stored;
  return '';
}

function buildUrl(path) {
  const base = getBaseUrl();
  const p = String(path || '').trim();
  if (!base) return p;
  if (!p) return base;
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  if (p.startsWith('/')) return base + p;
  return base + '/' + p;
}

function getToken() {
  // ✅ 你现在 token 是存到 'token' 里（你截图验证过了）
  return wx.getStorageSync('token')
    || wx.getStorageSync('access_token')
    || wx.getStorageSync('Authorization')
    || '';
}

function isSuccessCode(code) {
  return code === 0 || code === 200 || code === '0' || code === '200';
}

function pickMsg(data, defaultMsg) {
  if (!data) return defaultMsg || '请求失败';
  return data.msg || data.message || data.error || defaultMsg || '请求失败';
}

function logFail(tag, detail) {
  console.error(`[request:${tag}]`, detail);
}

// ✅ 核心请求函数（旧页面很多是 request({url, method, data}) 这么调）
function request(options) {
  const opt = options || {};
  const method = (opt.method || 'GET').toUpperCase();
  const url = buildUrl(opt.url || opt.path || '');

  const header = Object.assign(
    { 'content-type': 'application/json' },
    opt.header || opt.headers || {}
  );

  // ✅ 自动挂 Bearer
  const token = getToken();
  if (token && !header.Authorization && !header.authorization) {
    header.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  const data = opt.data || opt.body || {};

  return new Promise((resolve, reject) => {
    if (!url) {
      const err = { msg: 'BASE_URL 没配置，url 也为空' };
      logFail('no_url', { opt, err });
      reject(err);
      return;
    }

    wx.request({
      url,
      method,
      data,
      header,
      timeout: opt.timeout || TIMEOUT,
      success: (res) => {
        const status = res.statusCode;
        const body = res.data;

        // 1) HTTP 层失败
        if (status < 200 || status >= 300) {
          const err = { msg: `HTTP ${status}`, statusCode: status, url, body };
          logFail('http_error', err);
          wx.showToast({ title: err.msg, icon: 'none' });
          reject(err);
          return;
        }

        // 2) 标准返回：{ code, msg, data }
        if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'code')) {
          if (isSuccessCode(body.code)) {
            resolve(body.data !== undefined ? body.data : body);
            return;
          }

          const msg = pickMsg(body, '业务失败');
          const err = { msg, code: body.code, url, body };
          logFail('biz_error', err);

          if (body.code === 401 || body.code === '401' || /token|登录|auth/i.test(msg)) {
            wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          } else {
            wx.showToast({ title: msg, icon: 'none' });
          }

          reject(err);
          return;
        }

        // 3) 非标准返回（数组/字符串等）直接当成功
        resolve(body);
      },
      fail: (e) => {
        const err = {
          msg: e && e.errMsg ? e.errMsg : '网络请求失败',
          url,
          method,
          data
        };
        logFail('network_fail', err);
        wx.showToast({ title: err.msg, icon: 'none' });
        reject(err);
      }
    });
  });
}

// ✅ 给你更方便的写法：api.get('/api/xxx')
request.get = (url, data, options) => request(Object.assign({}, options, { url, data, method: 'GET' }));
request.post = (url, data, options) => request(Object.assign({}, options, { url, data, method: 'POST' }));
request.put = (url, data, options) => request(Object.assign({}, options, { url, data, method: 'PUT' }));
request.delete = (url, data, options) => request(Object.assign({}, options, { url, data, method: 'DELETE' }));

// ✅ 关键：兼容旧代码写法：const { request } = require('.../utils/request')
request.request = request;

module.exports = request;