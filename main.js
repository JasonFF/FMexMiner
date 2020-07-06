const moment = require('moment')

const FMex = require('./tools/FMex.js')

function main(config) {

  const fm = new FMex({
    key: config.key,
    secret: config.secret,
  })

  let $global = {
    perQuantity: config.quantity,
    $bm: {},
    $fm: {},
    bitmexAmountNum: config.bitmex,
    fmexAmountNum: config.fmex,
    cleanPositionPercent: config.clean,
    haveOrder: true
  }

  function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time))
  }

  async function bitmex() {
    await fm.getBMWs().then(client => {
      client.addStream('XBTUSD', 'orderBook10', function (data, symbol, tableName) {
        $global.$bm = {
          askPrice: data[0].asks[0][0],
          askAmount: data[0].asks[0][1],
          bidPrice: data[0].asks[1][0],
          bidAmount: data[0].asks[1][1],
        }
      })
    })
  }

  async function fmex() {
    await fm.getWs().then(fmws => {
      fmws.on('message', function (res) {
        let data = JSON.parse(res)
        if (data.type == 'ticker.btcusd_p') {
          $global.$fm = {
            lastPrice: data.ticker[0],
            buyPrice: data.ticker[2],
            sellPrice: data.ticker[4],
            buySize: data.ticker[3],
            sellSize: data.ticker[5]
          }
        }
      })
    })
  }

  function cancelAllOrders() {
    if ($global.haveOrder) {
      return fm.cancelAllOrders().then(res => {
        console.log(res)
        $global.haveOrder = false
      })
    }
    return false
  }

  async function toOrder() {
    let direction;
    let price;
    let {
      $bm,
      $fm,
      bitmexAmountNum,
      fmexAmountNum
    } = $global
    console.log('bm ', $bm)
    console.log('fm ', $fm)
    console.log('bitmexAmountNum ', bitmexAmountNum)
    console.log('fmexAmountNum ', fmexAmountNum)
    if ($bm.bidAmount > $bm.askAmount * bitmexAmountNum && $fm.buySize > $fm.sellSize * fmexAmountNum) {
      direction = "LONG"
      price = $fm.buyPrice
      console.log(`$bm: bidAmount > askAmount ==> ${$bm.bidAmount} > ${$bm.askAmount} * ${bitmexAmountNum}(${$bm.askAmount * bitmexAmountNum})`)
      console.log(`$fm: buySize > sellSize ==> ${$fm.buySize} > ${$fm.sellSize} * ${fmexAmountNum}(${$fm.sellSize * fmexAmountNum})`)
      console.log("direction: ", direction)
      console.log("price: ", price)
    }
    if ($bm.askAmount > $bm.bidAmount * bitmexAmountNum && $fm.sellSize > $fm.buySize * fmexAmountNum) {
      direction = "SHORT"
      price = $fm.sellPrice
      console.log(`$bm: askAmount > bidAmount ==> ${$bm.askAmount} > ${$bm.bidAmount} * ${bitmexAmountNum}(${$bm.bidAmount * bitmexAmountNum})`)
      console.log(`$fm: sellSize > buySize ==> ${$fm.sellSize} > ${$fm.buySize} * ${fmexAmountNum}(${$fm.buySize * fmexAmountNum})`)
      console.log("direction: ", direction)
      console.log("price: ", price)
    }
    if (!direction) {
      return true
    }

    return fm.createOrder({
      symbol: "BTCUSD_P",
      type: "LIMIT",
      direction: direction,
      price: price,
      quantity: $global.perQuantity,
      post_only: true,
      affiliate_code: 'gjed1x'
    }).then(res => {
      console.log("ORDER SUCCESS")
      console.log(direction, res.id, res.price)
      if (res.id) {
        $global.haveOrder = true
      }
      return true
    })
  }

  async function cleanPosition() {
    let res = await fm.getPosition()
    if (!res || !res.results || !res.results[0]) {
      return
    }

    let position = res.results[0]
    let quantity = position.quantity
    if (quantity == 0) {
      return
    }
    let entryPrice = position.entry_price
    let direction = position.direction

    let lastPrice = $global.$fm.lastPrice
    let cleanPositionPercent = $global.cleanPositionPercent

    if (Math.abs(lastPrice - entryPrice) / entryPrice > cleanPositionPercent) {
      console.log(`(lastPrice - entryPrice) / entryPrice: ${(lastPrice - entryPrice)/entryPrice}  cleanPositionPercent: ${cleanPositionPercent}`)
      fm.createOrder({
        symbol: "BTCUSD_P",
        type: "MARKET",
        direction: direction == 'long' ? 'SHORT' : "LONG",
        quantity,
        reduce_only: true,
        affiliate_code: 'gjed1x'
      }).then(res => {
        console.log("cleanPosition")
        console.log(direction, res.id, res.price)
      })
    } else {
      let price = 0
      if (direction == 'long') {
        let sellPrice = $global.$fm.sellPrice
        if (entryPrice > sellPrice) {
          price = (parseInt(entryPrice/1 - 1))
        } else {
          price = sellPrice
        }
      }
      if (direction == 'short') {
        let buyPrice = $global.$fm.buyPrice
        if (entryPrice < buyPrice) {
          price = (parseInt(entryPrice/1 + 1))
        } else {
          price = buyPrice
        }
      }
      console.log(`direction: ${direction} buyPrice: ${buyPrice} sellPrice: ${sellPrice} entryPrice: ${entryPrice} price: ${price}`)
      if (!price) {
        return
      }
      let reqObj = {
        symbol: "BTCUSD_P",
        type: "LIMIT",
        direction: direction == 'long' ? 'SHORT' : "LONG",
        price,
        quantity,
        post_only: true,
        affiliate_code: 'gjed1x'
      }
      fm.createOrder(reqObj).then(res => {
        console.log("cleanPosition")
        console.log(direction, res.id, res.price)
      })
    }
  }

  async function start() {
    await Promise.all([fmex(), bitmex()])
    while (true) {
      await sleep(100)
      console.log(moment().format('YYYY-MM-DD HH:mm:ss:SSS'))
      cancelAllOrders()
      toOrder()
      cleanPosition()
    }
  }
  return start
}

// main({
//   // 输入您的key
//   key: '3839773b172b4a49a65911ef1062cef0', 
//   // 输入您的secret
//   secret: 'e0c87237d5c94a1d857119e2b492224a', 
//   // 单次下单量
//   quantity: 1111, 
//   // bitmex 深度比，2 代表 2倍，例如卖单的量是买单的量的2倍，就触发了bitmex 卖单的逻辑。
//   bitmex: 2, 
//   // fmex 深度比，1.2 代表 1.2倍，例如卖单的量是买单的量的1.2倍，就触发了fmex 卖单的逻辑。当同时满足bitmex 和fmex 卖单逻辑的时候，才会下卖单。
//   fmex: 1.2, 
//   // 风控值，假如当前价格偏离开仓价格的 0.02 倍，那么就触发平仓，不管是盈利还是亏损，都会触发平仓。
//   clean:  0.02
// })()

module.exports = main