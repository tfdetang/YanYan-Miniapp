// pages/users/users.js
const config = require('../../utils/config.js')
const util = require('../../utils/util.js')
const app = getApp()

Page({

  data: {
    notSelf: true,
    isHideLoadMore: true,
    bottomLoading: true,
    scrollY: "",
    winWidth: 0,
    winHeight: 0,
    currentTab: 0,
    user: {},
    postList: [],
    commentList: [],
    likeList: [],
    imgList: []
  },

  onLoad: function (options) {
    var that = this
    var userId = wx.getStorageSync('userinfo').user_id
    if (options.userid) {
      userId = options.userid
    }
    var currentUserId = wx.getStorageSync('userinfo').user_id
    if (userId == currentUserId) {
      that.setData({
        notSelf: false
      })
    }
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
    })
    app.loadUserEvent(0, userId, 'post').then(res => {
      that.setData({
        postList: res.data.message_list,
      })
    })
  },

  onPullDownRefresh: function () { //下拉刷新信息
    var that = this
    wx.showNavigationBarLoading()
    that.setData({
      postList: [],
      commentList: [],
      likeList: [],
      imgList: [],
      currentTab: 0
    })
    app.loadUserEvent(0, that.data.user.user_id, 'post').then(res => {
      that.setData({
        postList: res.data.message_list,
      })
      wx.stopPullDownRefresh()
      wx.hideNavigationBarLoading()
      wx.showToast({
        title: '刷新完毕',
        icon: 'success',
        duration: 800
      })
    })
    app.getUser(wx.getStorageSync('userinfo').user_id).then(res => {
      that.setData({
        user: res.data
      })
    })    
  },

  onReachBottom: function () { // 滚动到底部时 才启用scroll-view
    this.setData({
      scrollY: "true",
    })
  },

  toUpper: function (e) { //滚动到顶部的操作
    this.setData({
      scrollY: "",
    })
  },

  toBottom: function (e) { // 滚动到底部时的操作
    var that = this
    if (that.data.bottomLoading) {
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
        var old_list = that.data.imgList
        var listname = 'imgList'
      }
      var offset = old_list.length
      if (tabIndex == 3) {
        app.loadUserPhoto(offset, userId).then(res => {
          var imageUrls = []
          for (var i = 0; i < res.data.num; i++) {
            imageUrls[i] = res.data.photo_list[i].url
          }
          var newlist = old_list.concat(imageUrls)
          var params = {}
          params[listname] = newlist
          params['isHideLoadMore'] = true
          params['bottomLoading'] = true
          that.setData(params)
          if (imageUrls.length == 0) {
            wx.showToast({
              title: '已经到底了',
              duration: 800
            })
          }
        })
      } else {
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
    }
  },

  bindChange: function (e) { // 选项卡变换时的操作
    var that = this;
    var tapIndex = e.detail.current
    var userId = that.data.user.user_id
    that.setData({
      currentTab: tapIndex
    })
    if (tapIndex == 0) {

    } else if (tapIndex == 1) {
      if (that.data.commentList.length == 0) {
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
      if (that.data.imgList.length == 0) {
        wx.showToast({
          icon: 'loading',
          title: '加载中',
          mask: true,
          duration: 1000
        })
        app.loadUserPhoto(0, userId).then(res => {
          var imageUrls = []
          for (var i = 0; i < res.data.num; i++) {
            imageUrls[i] = res.data.photo_list[i].url
          }
          console.log(imageUrls)
          that.setData({
            imgList: imageUrls
          })
        })
      }
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

  previewImage: function (event) { // 点击图片直接显示图片预览
    var current = event.currentTarget.dataset.current
    var urls = event.currentTarget.dataset.all
    wx.previewImage({
      current: current,
      urls: urls
    })
  },

  followButton: function (event) { //关注或取消关注
    wx.showToast({
      icon: 'loading',
      mask: true,
      duration: 1000
    })
    var that = this
    var userId = that.data.user.user_id
    var isFollowing = 'user.is_following'
    app.followUser(userId).then(res => {
      var params = {}
      params[isFollowing] = res.data.followed
      that.setData(params)
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

  toEditProfile: function (event) {
    var that = this
    var url = '../edit_profile/edit_profile'
    wx.navigateTo({
      url: url,
    })
  },

  toUser: function (event) { // 访问用户页面
    var that = this
    var userId = event.currentTarget.dataset.userid
    var selfId = wx.getStorageSync('userinfo').user_id
    if (userId != selfId) {
      var url = '../users/users?userid=' + userId
      wx.navigateTo({
        url: url,
      })
    }
  },
})