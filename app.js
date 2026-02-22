// app.js
// 说明：统一 BASE_URL 来源，优先读本地缓存（可在真机/不同网络下随时切换），避免写死局域网IP导致“网络错误”。

App({
  globalData: {
    BASE_URL: ""
  },

  onLaunch() {
    // 1) 优先使用你在 Storage 里配置的 BASE_URL（推荐）
    const stored = wx.getStorageSync("BASE_URL");

    // 2) 没配置的话，给一个默认值：
    // - 开发者工具：localhost
    // - 真机：也先给 localhost（你若没做内网穿透/上云，真机访问 localhost 一定失败，所以必须配 BASE_URL）
    const isDevtools = wx.getSystemInfoSync().platform === "devtools";
    const fallback = isDevtools ? "http://localhost:8080" : "http://localhost:8080";

    this.globalData.BASE_URL = stored || fallback;

    // 小提示：没配就提醒一下（像自己写的注释风格，简单直白）
    if (!stored && !isDevtools) {
      console.warn("未配置 BASE_URL：真机访问 localhost 会失败，请在 Storage 里设置 BASE_URL");
    }
  }
});