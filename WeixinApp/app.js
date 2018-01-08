//app.js
const config = require('utils/config.js')
const util = require('utils/util.js')

App({
  onLaunch: function () {
    // 展示本地存储能力
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
    this.login()
  },

  login: function () {
    var that = this;
    wx.showToast({
      title: '加载中',
      icon: 'loading',
      duration: 1000
    })
    var wxLogin = util.wxLogin()
    wxLogin().then(res => {
      wx.setStorageSync('code', res.code)
      var wxGetUserInfo = util.wxGetUserInfo()
      return wxGetUserInfo()
    }).then(res => {
      console.log('userinfo为')
      console.log(res.userInfo)
      var code = wx.getStorageSync('code')
      var url = config.getHostUrl() + 'login/wechat/'
      var data = {
        code: code,
        userinfo: res.userInfo
      }
      return util.getRequest(url, data)
    }).then(res => {
      wx.setStorageSync('userKey', res.data)
    })
  },

  userinfo: function () {
    var that = this
    var url = config.getHostUrl() + 'user/self/'
    var data = {
      login_key: wx.getStorageSync('userKey').login_key
    }
    return util.getRequest(url,data)
  },
  globalData: {
    userInfo: null
  },

  loadevents: function(start,direction) {
    var that = this
    var url = config.getHostUrl() + 'events/'
    var data = {
      login_key: wx.getStorageSync('userKey').login_key,
      start:start,
      direction:direction
    }
    return util.getRequest(url,data)
  }
})