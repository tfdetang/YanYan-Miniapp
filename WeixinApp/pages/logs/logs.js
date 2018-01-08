//logs.js
const util = require('../../utils/util.js')
const config = require('../../utils/config.js')
const app = getApp()

Page({
  data: {
    logs: []
  },
  onLoad: function () {
    wx.request({
      url: config.getHostUrl() + 'messages/',
      data:{
        login_key: wx.getStorageSync('login_key')
      },
      success: function(res){
        if (res.data.errCode == '4001'){
          app.login()
        }
      }
    })
  }
})
