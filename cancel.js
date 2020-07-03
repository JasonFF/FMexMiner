const FMex = require('./tools/FMex')

function cancel(config) {
  const fm = new FMex({
    key: config.key, // 输入您的key
    secret: config.secret, // 输入您的secret
  })
  
  async function cleanOrders() {
    return fm.cancelAllOrders().then(res => {
      console.log(res)
    })
  }
  return cleanOrders
}



module.exports = cancel