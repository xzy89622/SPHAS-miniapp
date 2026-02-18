// app.js
App({
  globalData: {
    // 开发者工具走 localhost，真机走局域网 IP
    BASE_URL: (wx.getSystemInfoSync().platform === 'devtools')
      ? 'http://localhost:8080'
      : 'http://192.168.1.30:8080'
  }
});


