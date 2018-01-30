//index.js
//获取应用实例
const config = require('../../utils/config.js')
const util = require('../../utils/util.js')
const app = getApp()

let col1H = 0
let col2H = 0

Page({
  data: {
    message_list: [],
    isHideLoadMore: true,
    isNoMore: false,
    winWidth: 0,
    winHeight: 0,
    imgWidth: 0,
    loadingCount: 0,
    col1: [],
    col2: []
  },
  onLoad: function (option) {
    var that = this
    wx.showToast({
      icon: 'loading',
      title: '加载中',
      mask: true,
      duration: 1500
    })
    wx.getSystemInfo({       // 设置屏幕高度
      success: function (res) {
        let ww = res.windowWidth;
        let wh = res.windowHeight;
        let imgWidth = ww * 0.44;
        let scrollH = wh;
        that.setData({
          winWidth: res.windowWidth,
          winHeight: res.windowHeight,
          imgWidth: imgWidth
        })
      }
    })
    app.loadEvents(0, 0).then(res => {
      var list_message = res.data.message_list
      that.setData({
        message_list: list_message,
      })
      if (list_message.length > 0) {
        wx.setStorageSync('messageBottom', list_message[list_message.length - 1].event_id) //记录最下面一条消息的id
      }
      wx.stopPullDownRefresh()
      wx.hideNavigationBarLoading()
    })
  },

  onPullDownRefresh: function () { //下拉刷新信息
    var that = this
    wx.showNavigationBarLoading()
    wx.reLaunch({
      url: "../followed/index"
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
      } else {
        wx.setStorageSync('messageBottom', list_message[list_message.length - 1].event_id)
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
    var selfId = wx.getStorageSync('userinfo').user_id
    if (userId != selfId) {
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

  onImageLoad: function (e) {
    let imageId = e.currentTarget.id;
    let oImgW = e.detail.width;         //图片原始宽度
    let oImgH = e.detail.height;        //图片原始高度
    let imgWidth = this.data.imgWidth;  //图片设置的宽度
    let scale = imgWidth / oImgW;        //比例计算
    let imgHeight = oImgH * scale;      //自适应高度

    let images = this.data.message_list;
    let imageObj = null;

    for (let i = 0; i < images.length; i++) {
      let img = images[i];
      if (img.event_id == imageId) {
        imageObj = img;
        break;
      }
    }

    imageObj.height = imgHeight;

    let loadingCount = this.data.loadingCount - 1;
    let col1 = this.data.col1;
    let col2 = this.data.col2;

    if (col1H <= col2H) {
      col1H += imgHeight + 61;
      col1.push(imageObj);
    } else {
      col2H += imgHeight + 61;
      col2.push(imageObj);
    }

    let data = {
      loadingCount: loadingCount,
      col1: col1,
      col2: col2
    };


    if (!loadingCount) {
      data.message_list = [];
    }

    console.log(data)

    this.setData(data);
  },
})
