// pages/users/users.js
const config = require('../../utils/config.js')
const util = require('../../utils/util.js')
const app = getApp()

Page({

  data: {
    isHideLoadMore: true,
    bottomLoading: true,
    scrollY: "",
    winWidth: 0,
    winHeight: 0,
    currentTab: 0,
    user: {},
    postList: [],
    commentList: [],
    likeList: []
  },

  onLoad: function (options) {
    var that = this
    var userId = options.userid
    wx.showToast({
      icon: 'loading',
      mask: true,
      duration: 1500
    })
    wx.getSystemInfo({       // 设置屏幕高度
      success: function (res) {
        that.setData({
          winWidth: res.windowWidth,
          winHeight: res.windowHeight
        })
      }
    })
    app.getUser(userId).then(res => {
      that.setData({
        user: res.data
      })
      wx.setNavigationBarTitle({
        title: res.data.nickname
      })
    })
    app.loadUserEvent(0, userId, 'post').then(res => {
      that.setData({
        postList: res.data.message_list,
      })
    })
  },

  onReachBottom: function () {
    this.setData({
      scrollY: "true",
    })
  },

  toUpper: function (e) {
    this.setData({
      scrollY: "",
    })
  },

  toBottom: function(e) {
    var that = this
    if (that.data.bottomLoading){
      that.setData({
        isHideLoadMore: false,
        bottomLoading: false
      })
      var tabIndex = that.data.currentTab
      var userId = that.data.user.user_id
      if (tabIndex == 0) {
        var old_list = that.data.postList
        var opration = 'post'
        var listname = 'postList'
      } else if (tabIndex == 1) {
        var old_list = that.data.commentList
        var opration = 'comment'
        var listname = 'commentList'
      } else if (tabIndex == 2) {
        var old_list = that.data.likeList
        var opration = 'like'
        var listname = 'likeList'
      } else {

      }
      var offset = old_list.length
      app.loadUserEvent(offset, userId, opration).then(res => {
        var get_list = res.data.message_list
        var newlist = old_list.concat(get_list)
        var params = {}
        params[listname] = newlist
        params['isHideLoadMore'] = true
        params['bottomLoading'] = true
        that.setData(params)
        if (get_list.length == 0) {
          wx.showToast({
            title: '已经到底了',
            duration: 800
          })
        }
      })
    }
  },

  bindChange: function (e) {
    var that = this;
    var tapIndex = e.detail.current
    var userId = that.data.user.user_id
    that.setData({
      currentTab: tapIndex
    })
    if (tapIndex == 0) {

    } else if (tapIndex == 1) {
      if (that.data.commentList.length == 0){
        wx.showToast({
          icon: 'loading',
          title: '加载中',
          mask: true,
          duration: 1000
        })
        app.loadUserEvent(0, userId, 'comment').then(res => {
          that.setData({
            commentList: res.data.message_list,
          })
        })
      }
    } else if (tapIndex == 2) {
      if (that.data.likeList.length == 0) {
        wx.showToast({
          icon: 'loading',
          title: '加载中',
          mask: true,
          duration: 1000
        })
        app.loadUserEvent(0, userId, 'like').then(res => {
          that.setData({
            likeList: res.data.message_list,
          })
        })
      }

    } else {

    }
  },

  swichNav: function (e) {
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

  previewImage: function (event) { // 点击图片直接显示图片预览
    var current = event.currentTarget.dataset.current
    var urls = event.currentTarget.dataset.all
    wx.previewImage({
      current: current,
      urls: urls
    })
  },

  favoButton: function (event) { //点击喜爱
    wx.showToast({
      icon: 'loading',
      mask: true,
      duration: 1000
    })
    var that = this
    var listName = event.currentTarget.dataset.listname
    var index = event.currentTarget.dataset.idx
    var messageId = event.currentTarget.dataset.message.id
    var favoCount = listName + "[" + index + "].favo_count"
    var isFavoed = listName + "[" + index + "].is_favoed"
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
        if (res.tapIndex == 0) {  //直接转发
          app.retweetMessage(messageId, "").then(res => {
            var params = {}
            params[quoteCount] = res.data.quotecount
            params[isQuoted] = true
            that.setData(params)
          })
        } else { // 转发并回复
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
    var url = '../users/users?userid=' + userId
    wx.navigateTo({
      url: url,
    })
  },
})