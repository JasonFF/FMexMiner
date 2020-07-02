'use strict';
const BitMEXClient = require('./index');
// See 'options' reference below
const client = new BitMEXClient({testnet: false});
const moment = require('moment')
const fs = require('fs')
// handle errors here. If no 'error' callback is attached. errors will crash the client.
client.on('error', console.error);
client.on('open', () => console.log('Connection opened.'));
client.on('close', () => console.log('Connection closed.'));
client.on('initialize', () => console.log('Client initialized, data is flowing.'));

client.addStream('XBTUSD', 'trade', function(data, symbol, tableName) {
  // console.log(`Got update for ${tableName}:${symbol}. Current state:\n${JSON.stringify(data).slice(0, 100)}...`);
  let res = data.slice(-30).reverse()

  let startPrice = res[res.length - 1].side == 'Buy' ? res[res.length - 1].price : (res[res.length - 1].price/1 - 0.5).toFixed(1)/1
  let endPrice = res[0].side == 'Buy' ? res[0].price : (res[0].price/1 - 0.5).toFixed(1)/1
  let result = 0
  let buyCount = 0
  res.forEach(it => {
    if (it.side == 'Buy') {
      buyCount ++
    }
    let direct = it.side == 'Buy' ? 1 : -1
    result += direct * it.size
  })
  let resData = {
    time: moment(res[0].timestamp).format('HH:mm:ss'),
    startPrice,
    endPrice,
    buyCount,
    amountCount: result
  }
  console.log(resData)
  fs.writeFile('./bitmex.json', JSON.stringify(resData), () => {})
  // Do something with the table data...
});
