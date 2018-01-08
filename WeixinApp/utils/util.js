const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

function json2Form(json){
  var str = [];
  for(var p in json){
    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(json[p]))
  }
  return str.join("&")
}

function wxPromisify(fn) {
  return function (obj = {}) {
    return new Promise((resolve, reject) => {
      obj.success = function (res) {
        resolve(res)
      }

      obj.fail = function (res) {
        reject(res)
      }

      fn(obj)
    })
  }
}

function getRequest(url, data){
  var getRequest = wxPromisify(wx.request)
  return getRequest({
    url: url,
    method: 'GET',
    data: data
  })
}

function postRequest(url, data){
  var postRequest = wxPromisify(wx.request)
  return postRequest({
    url:url,
    method: 'POST',
    data:data,
    header: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
  })
}

function wxLogin(){
  return wxPromisify(wx.login)
}

function wxGetUserInfo(){
  return wxPromisify(wx.getUserInfo)
}

module.exports = {
  wxLogin: wxLogin,
  wxGetUserInfo: wxGetUserInfo,
  getRequest: getRequest,
  postRequest: postRequest,
  json2Form: json2Form,
  formatTime: formatTime,
  wxPromisify: wxPromisify
}
