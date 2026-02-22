// pages/login/login.js
// 说明：
// 1) login.wxml 里按钮 bindtap="onLogin"，所以这里必须有 onLogin 方法
// 2) 项目 app.json 没有 tabBar，所以不要 switchTab，直接 reLaunch
// 3) 统一调用 auth.login()，拿到 token 存起来

const auth = require("../../utils/auth");

Page({
  data: {
    username: "",
    password: "",
    loading: false,
  },

  onUsername(e) {
    this.setData({ username: e.detail.value });
  },

  onPassword(e) {
    this.setData({ password: e.detail.value });
  },

  // ✅ 兼容 wxml：bindtap="onLogin"
  onLogin() {
    this.doLogin();
  },

  // ✅ “没有账号？去注册”
  goRegister() {
    wx.navigateTo({ url: "/pages/register/register" });
  },

  async doLogin() {
    if (this.data.loading) return;

    const username = (this.data.username || "").trim();
    const password = (this.data.password || "").trim();

    if (!username || !password) {
      wx.showToast({ title: "请输入账号密码", icon: "none" });
      return;
    }

    this.setData({ loading: true });

    try {
      // 调后端 /api/auth/login
      const token = await auth.login(username, password);

      if (!token) {
        wx.showToast({ title: "登录失败：未返回token", icon: "none" });
        return;
      }

      // 存 token
      wx.setStorageSync("token", token);

      wx.showToast({ title: "登录成功", icon: "success" });

      // ✅ 这个项目没 tabBar，所以用 reLaunch
      wx.reLaunch({ url: "/pages/index/index" });
    } catch (e) {
      console.error("login error =>", e);
      wx.showToast({ title: "登录失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },
});