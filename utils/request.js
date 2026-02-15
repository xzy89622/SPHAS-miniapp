// utils/request.js
// 作用：封装 wx.request，统一 baseURL、自动携带 token、统一处理后端返回 R<T>

const { getToken, clearToken } = require('./auth');

function getBaseUrl() {
  // 优先读全局配置（方便你后面一键切环境）
  const app = getApp && getApp();
  if (app && app.globalData && app.globalData.BASE_URL) return app.globalData.BASE_URL;

  // 兜底：开发工具本地联调
  return 'http://localhost:8080';
}

/**
 * 通用请求方法
 * @param {Object} options
 * @param {string} options.url 接口路径，例如 /api/auth/login
 * @param {string} [options.method] GET/POST...
 * @param {Object} [options.data] 请求体/参数
 * @param {Object} [options.header] 额外请求头
 * @returns {Promise<any>} 返回后端 data
 */
function request(options) {
  const token = getToken();
  const BASE_URL = getBaseUrl();

  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(options.header || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success(res) {
        // ✅ 先处理 HTTP 状态码（很多后端 401/403 不一定返回你想要的 code 字段）
        if (res.statusCode === 401 || res.statusCode === 403) {
          clearToken();
          wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          wx.reLaunch({ url: '/pages/login/login' });
          reject(new Error('Unauthorized'));
          return;
        }

        const body = res.data;

        // 后端统一返回：{ code: 0/1, msg: '', data: any }
        if (body && body.code === 0) {
          resolve(body.data);
          return;
        }

        const msg = (body && body.msg) ? body.msg : '请求失败';

        // token 失效/未登录：清理并回到登录页
        if (msg.includes('未登录') || msg.toLowerCase().includes('token')) {
          clearToken();
          wx.showToast({ title: '请先登录', icon: 'none' });
          wx.reLaunch({ url: '/pages/login/login' });
          reject(new Error(msg));
          return;
        }

        wx.showToast({ title: msg, icon: 'none' });
        reject(new Error(msg));
      },
      fail(err) {
        wx.showToast({ title: '网络错误：请确认后端已启动/地址可访问', icon: 'none' });
        reject(err);
      }
    });
  });
}

module.exports = { request };
