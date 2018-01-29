//index.js
//获取应用实例
const config = require('../../utils/config.js')
const util = require('../../utils/util.js')
var WxParse = require('../../wxParse/wxParse.js')
const app = getApp()

Page({
  data: {
    message_list: [],
    isHideLoadMore: true,
    isNoMore: false,
  },
  onLoad: function (option) {
    var that = this
    wx.showToast({
      icon: 'loading',
      title: '加载中',
      mask: true,
      duration: 1500
    })
    app.loadEvents(0, 0).then(res => {
      var list_message = res.data.message_list
      that.setData({
        message_list: list_message,
      })
      wx.setStorageSync('messageBottom', list_message[list_message.length - 1].event_id) //记录最下面一条消息的id
    })
  },

  onPullDownRefresh: function () { //下拉刷新信息
    var that = this
    wx.showNavigationBarLoading()
    app.loadEvents(0, 0).then(res => {      
      var list_message = res.data.message_list
      that.setData({
        message_list: list_message,
      })
      wx.setStorageSync('messageBottom', list_message[list_message.length - 1].event_id)
      wx.stopPullDownRefresh()
      wx.hideNavigationBarLoading()
      wx.showToast({
        title: '刷新完毕',
        icon: 'success',
        duration: 800
      })
    })
  },

  onReachBottom: function () { //浏览到底部自动更新信息
    var that = this
    that.setData({
      isHideLoadMore: false
    })
    var bottom = wx.getStorageSync('messageBottom')
    app.loadEvents(bottom, 0).then(res => {
      var get_list = res.data.message_list
      var old_list = that.data.message_list
      var list_message = old_list.concat(get_list)
      that.setData({
        message_list: list_message,
        isHideLoadMore: true
      })
      if (list_message[list_message.length - 1].event_id == bottom) {
        that.setData({
          isNoMore: true
        })
        wx.showToast({
          title: '已经到底了',
          duration: 800
        })
      } else {
        wx.setStorageSync('messageBottom', list_message[list_message.length - 1].event_id)
      }
    })
  },

  previewImage: function (event) { // 点击图片直接显示图片预览
    var current = event.currentTarget.dataset.current
    var urls = event.currentTarget.dataset.all
    wx.previewImage({
      current: current,
      urls: urls
    })
  },

  toMessage: function (event) { // 跳转链接
    var that = this
    var messageId = event.currentTarget.dataset.messageid
    var focus = event.currentTarget.dataset.focus
    var url = '../message_detail/message_detail?messageid=' + messageId + '&focus=' + focus
    wx.navigateTo({
      url: url,
    })
  },

  toUser: function (event) { // 访问用户页面
    var that = this
    var userId = event.currentTarget.dataset.userid
    var selfId = wx.getStorageSync('userinfo').user_id
    if (userId != selfId){
      var url = '../users/users?userid=' + userId
      wx.navigateTo({
        url: url,
      })
    }
  },

  toEditor: function (event) { // 跳转到发推文的页面
    var that = this
    var url = '../editor/editor'
    wx.navigateTo({
      url: url,
    })
  },

  favoButton: function (event) { //点击喜爱
    wx.showToast({
      icon: 'loading',
      title: '操作中',
      mask: true,
      duration: 1000
    })
    var that = this
    var listName = event.currentTarget.dataset.listname
    var index = event.currentTarget.dataset.idx
    var messageId = event.currentTarget.dataset.message.id
    var favoCount = listName + "[" + index + "].favo_count"
    var isFavoed = listName+ "[" + index + "].is_favoed"
    app.favoMessage(messageId).then(res => {
      var params = {}
      params[favoCount] = res.data.count
      params[isFavoed] = res.data.favo
      that.setData(params)
    })
  },

  retweetButton: function (event) { //点击转发
    var that = this
    var listName = event.currentTarget.dataset.listname
    var index = event.currentTarget.dataset.idx
    var messageId = event.currentTarget.dataset.message.id
    var url = '../message_detail/message_detail?messageid=' + messageId + '&focus=true'
    var quoteCount = listName + "[" + index + "].quote_count"
    var isQuoted = listName + "[" + index + "].is_quoted"
    wx.showActionSheet({
      itemList: ['转发', '转发并回复'],
      success: function (res) {
        if (res.tapIndex == 0){  //直接转发
          app.retweetMessage(messageId,"").then(res => {
            var params = {}
            params[quoteCount] = res.data.quotecount
            params[isQuoted] = true
            that.setData(params)
          })
        }else{ // 转发并回复
          wx.navigateTo({
            url: url + '&retweetCheck=true',
          })
        }
        console.log(res.tapIndex)
        console.log(messageId)
      },
      fail: function (res) {
        console.log(res.errMsg)
      }
    })
  }
})
