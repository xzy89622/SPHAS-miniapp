// utils/auth.js
// 作用：统一管理 token（存/取/清除）
// 以后所有页面都只通过这里操作 token，避免到处写 wx.getStorageSync

const TOKEN_KEY = 'SPHAS_TOKEN';

/**
 * 获取本地 token
 * @returns {string} token 字符串，没有则返回空字符串
 */
function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

/**
 * 保存 token 到本地
 * @param {string} token
 */
function setToken(token) {
  wx.setStorageSync(TOKEN_KEY, token);
}

/**
 * 清除本地 token
 */
function clearToken() {
  wx.removeStorageSync(TOKEN_KEY);
}

module.exports = {
  getToken,
  setToken,
  clearToken
};
