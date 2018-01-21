// pages/notify/notify.js
const config = require('../../utils/config.js')
const util = require('../../utils/util.js')
const app = getApp()

Page({


  data: {
    winWidth: 0,
    winHeight: 0,
    currentTab: 0,
    notifyList: [],
    chatList: []
  },

  onLoad: function (options) {
    var that = this
    wx.getSystemInfo({       // 设置屏幕高度
      success: function (res) {
        that.setData({
          winWidth: res.windowWidth,
          winHeight: res.windowHeight
        })
      }
    })
    app.loadNotifies(0).then(res => {
      that.setData({
        notifyList: res.data.notify_list
      })
    })
  },

  toMessage: function (event) { // 跳转链接
    var that = this
    var messageId = event.currentTarget.dataset.messageid
    var focus = event.currentTarget.dataset.focus
    var url = '../message_detail/message_detail?messageid=' + messageId
    wx.navigateTo({
      url: url,
    })
  },

  toUser: function (event) { // 访问用户页面
    var that = this
    console.log(event)
    var userId = event.currentTarget.dataset.userid
    var selfId = wx.getStorageSync('userinfo').user_id
    if (userId != selfId) {
      var url = '../users/users?userid=' + userId
      wx.navigateTo({
        url: url,
      })
    }
  },

  toUserChat: function (event){
    var that = this
    console.log(event)
    var userId = event.currentTarget.dataset.userid
    var nickName = event.currentTarget.dataset.nickname
    var userName = event.currentTarget.dataset.username
    var avatar = event.currentTarget.dataset.avatar
    var url = '../chat/chat?userid=' + userId + '&nickname=' + nickName + '&username=' + userName + '&avatar=' + avatar
    wx.navigateTo({
      url: url,
    })
  },

  read: function (event) {
    var that = this
    var notifyId = event.currentTarget.dataset.notifyid
    var index = event.currentTarget.dataset.idx
    console.log(event)
    app.readNotify(notifyId).then(res => {
      var notifyRead = "notifyList[" + index + "].read"
      var params = {}
      params[notifyRead] = 1
      that.setData(params)
    })
  },

  bindChange: function (e) { // 选项卡变换时的操作
    var that = this;
    var tapIndex = e.detail.current
    that.setData({
      currentTab: tapIndex
    })
    if (tapIndex == 0) {
      app.loadNotifies(0).then(res => {
        that.setData({
          notifyList: res.data.notify_list
        })
      })
    } else if (tapIndex == 1) {
      app.loadChatList().then(res => {
        that.setData({
          chatList: res.data.chat_list
        })
      })
      
    }
  },

  swichNav: function (e) { // 切换选项卡
    var that = this;
    var tapIndex = e.target.dataset.current
    if (this.data.currentTab === tapIndex) {
      return false;
    } else {
      that.setData({
        currentTab: tapIndex
      })
    }
  },
})