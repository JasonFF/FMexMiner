const FMex = require('./FMex')
const userConfig = require('./config')

const fm = new FMex({
  key: userConfig.key, // 输入您的key
  secret: userConfig.secret, // 输入您的secret
  BASEURL: userConfig.BASEURL // 请求的baseUrl, 目前是模拟盘，正式还未规定。
})

async function cleanOrders() {
  return fm.cancelAllOrders().then(res => {
    console.log(res)
  })
}

cleanOrders()