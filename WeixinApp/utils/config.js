var host_url='https://quanterhome.com/';
var qiniu_config={
  region: "ECN",
  uptokenURL: "https://quanterhome.com/qiniu/uptoken",
  shouldUseQiniuFileName: true
  };

function _getHostUrl(){
  return host_url
}

function _getUptoken(){
  return qiniu_config
}

module.exports = {
  getUptoken: _getUptoken,
  getHostUrl: _getHostUrl,
};