// pages/login/login.js
// 登录页：把后端返回的 msg 直接提示出来（不再只显示“登录失败”）

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

  onLogin() {
    this.doLogin();
  },

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
      const token = await auth.login(username, password);

      if (!token) {
        wx.showToast({ title: "登录失败：未返回token", icon: "none" });
        return;
      }

      wx.setStorageSync("token", token);

      wx.showToast({ title: "登录成功", icon: "success" });

      wx.reLaunch({ url: "/pages/index/index" });
    } catch (e) {
      // ✅ 关键：把真实错误信息吐出来
      console.error("login error =>", e);

      // 后端 reject(body) 时，body 里一般有 msg/code
      const msg =
        (e && e.msg) ||
        (e && e.errMsg) ||
        (e && e.message) ||
        "登录失败";

      wx.showToast({ title: msg, icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },
});