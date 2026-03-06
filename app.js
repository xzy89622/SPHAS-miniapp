// app.js
// 目标：别再一直提示“未配置 BASE_URL”但请求又能发出去导致你误判

App({
  globalData: {},

  onLaunch() {
    // 只做提示，不做强依赖
    const stored = (wx.getStorageSync("BASE_URL") || "").trim();
    const isDevtools = wx.getSystemInfoSync().platform === "devtools";

    if (!stored && !isDevtools) {
      console.warn("未配置 BASE_URL：真机必须在 Storage 设置 BASE_URL（建议公网 https 域名）");
    }
  },

  onPageNotFound() {
    wx.reLaunch({ url: "/pages/login/login" });
  },
});