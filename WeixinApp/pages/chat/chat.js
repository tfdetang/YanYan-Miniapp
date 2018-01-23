// pages/chat/chat.js
const config = require('../../utils/config.js')
const util = require('../../utils/util.js')
const app = getApp()

Page({

  data: {
    top: 0,
    animation:"",
    isHideLoadMore: true,
    focus: false,
    toolsHidden: true,
    uploadHidden: true,
    retweetCheck: false,
    winWidth: 0,
    winHeight: 0,
    start:0,
    textValue:"",
    user:{},
    me:{},
    chatList:[]  
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
    that.setData({
      user:options,
      me: wx.getStorageSync('userinfo')
    })
    wx.setNavigationBarTitle({
      title: '@' + that.data.user.username
    })
    app.loadChat(that.data.user.userid, 0).then(res => {
      that.setData({
        chatList: res.data.chat_list,
        top: 3000,
        start: res.data.chat_list[0].event_id
      })
    })
    console.log(that.data.user)
  },

  getText: function (event) { // 自动获得文本框里文字的值，用于提交（不使用表单）
    var that = this
    that.setData({
      textValue: event.detail.value
    })
  },

  sendSubmit: function (event) {
    var that = this
    var body = that.data.textValue
    app.sendChat(that.data.user.userid, body).then(res => {
      var sendData = res.data
      var oldList = that.data.chatList
      oldList.push(sendData)
      that.setData({
        chatList: oldList,
        top: that.data.top + 1000,
        textValue:"",
        animation:true
      })
    })
  },

  toUpper: function (event){
    var that = this
    var oldList = that.data.chatList
    app.loadChat(that.data.user.userid, that.data.start).then(res => {
      var getData = res.data.chat_list
      var newList = getData.concat(oldList)
      if (getData.length > 0){
        that.setData({
          chatList: newList,
          start: getData[0].event_id
        })
      }
    })
  },

  onShow: function () {
  
  },

})