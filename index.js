const moment = require('moment')
const BitMEXClient = require('./tools/bitmexWs/index');
const WebSocket = require('ws')
const FMex = require('./tools/FMex.js')
const config = require('./config')

let {key, secret} = config

const fm = new FMex({
  key,
  secret,
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
function bitmex() {
  return new Promise(resolve => {
    // See 'options' reference below
    let client = new BitMEXClient({testnet: false});
    // handle errors here. If no 'error' callback is attached. errors will crash the client.
    client.on('error', e => {
      console.log('from error')
      console.log(e)
      process.exit()
    });
    client.on('open', () => console.log('Connection opened.'));
    client.on('close', () => {
      console.log('from close')
      console.log('Connection closed.')
      process.exit()
    });
    client.on('initialize', () => console.log('Client initialized, data is flowing.'));
    client.addStream('XBTUSD', 'orderBook10', function(data, symbol, tableName) {
      $global.$bm = {
        askPrice: data[0].asks[0][0],
        askAmount: data[0].asks[0][1],
        bidPrice: data[0].asks[1][0],
        bidAmount: data[0].asks[1][1],
      }
      resolve()
    })
  })
}


function fmex() {
  return new Promise(resolve => {
    const fmws = new WebSocket('wss://api.fmextest.net/v2/ws');
    fmws.on('open', function open() {
      setInterval(() => {
        fmws.send(JSON.stringify({"cmd":"ping","args":[new Date().getTime()],"id":'ping'}))
      }, 10000)
      setTimeout(() => {
        fmws.send(JSON.stringify({"cmd":"sub","args":["ticker.BTCUSD_P"],"id":"ticker"}))
      }, 1000)
    });
    fmws.on('close', function() {
      console.log('close')
      process.exit()
    })
    fmws.on('error', function(e) {
      console.log('error', e)
      process.exit()
    })
    fmws.on('message', function(res) {
      let data = JSON.parse(res)
      if (data.type == 'ticker.btcusd_p') {
        $global.$fm = {
          lastPrice: data.ticker[0],
          buyPrice: data.ticker[2],
          sellPrice: data.ticker[4],
          buySize: data.ticker[3],
          sellSize: data.ticker[5]
        }
        resolve()
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
  let {$bm, $fm, bitmexAmountNum, fmexAmountNum} = $global
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
  }
}


async function main() {
  await Promise.all([fmex(), bitmex()])
  for (let i = 0; i < 999999999999; i++) {
    await sleep(100)
    console.log(moment().format('YYYY-MM-DD HH:mm:ss:SSS'))
    cancelAllOrders()
    toOrder()
    cleanPosition()
  }
}

main()