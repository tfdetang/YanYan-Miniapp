// pages/moment/moment.js
Page({

  data: {
    currentMoment:0,
    winWidth: 0,
    winHeight: 0,
    moments:[]  
  },

  onLoad: function (options) {
    var that = this
    var moments = wx.getStorageSync('moments')
    that.setData({
      moments:moments,
      currentMoment:options.idx
    })
    wx.getSystemInfo({       // 设置屏幕高度
      success: function (res) {
        that.setData({
          winWidth: res.windowWidth,
          winHeight: res.windowHeight
        })
      }
    })
  },


  toMessage: function (event) { // 跳转链接
    var that = this
    var messageId = event.currentTarget.dataset.messageid
    var url = '../message_detail/message_detail?messageid=' + messageId + '&focus='
    wx.navigateTo({
      url: url,
    })
  },

  onShareAppMessage: function () {
  
  }
})