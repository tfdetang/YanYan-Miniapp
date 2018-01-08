//index.js
//获取应用实例
const config = require('../../utils/config.js')
const util = require('../../utils/util.js')
const app = getApp()

Page({
  data: {
    message_list:[]
  },
  onLoad: function(){
    app.loadevents(0,0).then(res => {
      console.log(res.data)
      this.setData({
        message_list:res.data.message_list
      })
    })
  },
  previewImage: function (event)  {
    var current = event.currentTarget.dataset.current
    var urls = event.currentTarget.dataset.all
    wx.previewImage({
      current: current, // 当前显示图片的http链接
      urls: urls // 需要预览的图片http链接列表
    })
  }

})
