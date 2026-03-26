const request = require('./request');

const TOKEN_KEY = 'token';
const USER_ID_KEY = 'userId';
const USER_INFO_KEY = 'userInfo';

function setToken(token) {
  const value = token || '';
  if (value) {
    wx.setStorageSync(TOKEN_KEY, value);
  } else {
    wx.removeStorageSync(TOKEN_KEY);
  }
}

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

function clearToken() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(USER_ID_KEY);
  wx.removeStorageSync(USER_INFO_KEY);
}

function setUserInfo(profile) {
  const info = profile || {};
  wx.setStorageSync(USER_INFO_KEY, info);

  if (info && info.id) {
    wx.setStorageSync(USER_ID_KEY, info.id);
  } else {
    wx.removeStorageSync(USER_ID_KEY);
  }
}

function getUserInfo() {
  return wx.getStorageSync(USER_INFO_KEY) || null;
}

function getUserId() {
  return wx.getStorageSync(USER_ID_KEY) || '';
}

// 账号/手机号登录
function login(username, password) {
  return request.post('/api/auth/login', { username, password });
}

// 微信快捷登录
function wxLogin(code, nickname, avatarUrl) {
  return request.post('/api/auth/wx-login', {
    code,
    nickname: nickname || '',
    avatarUrl: avatarUrl || ''
  });
}

// 微信手机号授权一键登录
function wxPhoneLogin(loginCode, phoneCode, nickname, avatarUrl) {
  return request.post('/api/auth/wx-phone-login', {
    loginCode,
    phoneCode,
    nickname: nickname || '',
    avatarUrl: avatarUrl || ''
  });
}

// 注册
function register(payload) {
  return request.post('/api/auth/register', payload);
}

// 获取当前登录用户资料
function profile() {
  return request.get('/api/user/profile');
}

// 登录后同步当前用户信息
async function syncProfile() {
  const info = await profile();
  setUserInfo(info || {});
  return info;
}

module.exports = {
  setToken,
  getToken,
  clearToken,
  setUserInfo,
  getUserInfo,
  getUserId,
  login,
  wxLogin,
  wxPhoneLogin,
  register,
  profile,
  syncProfile
};