const nodeFetch = require('node-fetch');
const crypto = require('crypto');

function fetch(url, config) {
  return nodeFetch(url, {
    timeout: 30000,
    ...config
  })
}


function getUrl(url) {
  
  
  return `https://api.fmextest.net${url}`
}

class FMex {
    constructor(obj) {
        this.config = obj;
    }
    getconfig() {
      console.log(this.config);
    }
    getQueryString (params) {
      var keys = []
      for (var i in params) {
          keys.push(i)
      }
      keys.sort();
      var p = []
      keys.forEach(item => {
        if (params[item]) {
          p.push(item + '=' + params[item]) // encodeURIComponent
        }
      })
      var queryString = p.join('&')
      return queryString
    }
    // 工具类
    tob64(str) {
        return new Buffer(str).toString('base64')
    }
    secret(str) {
        str = this.tob64(str);
        str = crypto.createHmac('sha1', this.config.secret).update(str).digest().toString('base64');
        return str;
    }
    getTime() {
      return new Date().getTime()
      return fetch(getUrl('/v2/public/server-time'), {
        method: 'GET'
      }).then(res => res.json()).then(res => {
        return res.data
      })
    }
    getCurrencies() {
      return fetch(getUrl('/v2/public/contracts/currencies'), {
        method: 'GET'
      }).then(res => res.json()).then(res => {
        return res.data
      }).catch(e => {
        console.log(e)
        return {}
      })
    }
    getSymbols() {
      return fetch(getUrl('/v2/public/indexes/symbols'), {
        method: 'GET'
      }).then(res => res.json()).then(res => {
        return res.data
      }).catch(e => {
        console.log(e)
        return {}
      })
    }
    getTicker(symbol) {
      return fetch(getUrl(`/v2/market/ticker/${symbol}`), {
        method: 'GET'
      }).then(res => res.json()).then(res => {
        return res.data
      }).catch(e => {
        console.log(e)
        return {}
      })
    }
    async getAccount() {
      let time = await this.getTime()
      let url = getUrl(`/v3/contracts/accounts`)
      let sign = this.secret(`GET${url}${time}`)
      return fetch(url, {
        method: 'GET',
        headers: {
          'FC-ACCESS-KEY': this.config.key,
          'FC-ACCESS-SIGNATURE': sign,
          'FC-ACCESS-TIMESTAMP': time,
          'Content-Type': 'application/json;charset=UTF-8'
        }
      }).then(res => res.json()).then(res => {
        if (!res.data) {
          console.log(res)
          return {}
        }
        return res.data
      }).catch(e => {
        console.log(e)
        return {}
      })
    }

    // symbol	Y	合约代码，例如"BTCUSD_P"
    // type	Y	订单类型，LIMIT/MARKET
    // direction	Y	仓位方向LONG/SHORT
    // source	""	订单来源标识，例如"WEB", "APP"，字母和数字组合
    // price	仅限价单	限价单报价
    // quantity	Y	订单数量，至少为1
    // trigger_on		订单触发价格，如果不填，则立刻执行
    // trailing_distance		止盈止损订单触发距离，如果不填，则不会按止盈止损执行
    // fill_or_kill	false	是否设置FOK订单
    // immediate_or_cancel	false	是否设置IOC订单
    // post_only	false	是否设置post_only订单
    // hidden	false	是否设置Hidden订单
    // reduce_only	false	是否设置reduce_only订单

    async createOrder(body) {
      let time = await this.getTime()
      let url = getUrl(`/v3/contracts/orders`)
      let queryStr = this.getQueryString(body)
      let sign = this.secret(`POST${url}${time}${queryStr}`)
      return fetch(url, {
        method: 'POST',
        headers: {
          'FC-ACCESS-KEY': this.config.key,
          'FC-ACCESS-SIGNATURE': sign,
          'FC-ACCESS-TIMESTAMP': time,
          'Content-Type': 'application/json;charset=UTF-8'
        },
        body: JSON.stringify(body)
      }).then(res => res.json()).then(res => {
        if (!res.data) {
          console.log(res)
          return {}
        }
        return res.data
      }).catch(e => {
        console.log(e)
        return {}
      })
    }

    async getOrders() {
      let time = await this.getTime()
      let url = getUrl(`/v3/contracts/orders/open`)
      // let queryStr = this.getQueryString(body)
      let sign = this.secret(`GET${url}${time}`)
      return fetch(url, {
        method: 'GET',
        headers: {
          'FC-ACCESS-KEY': this.config.key,
          'FC-ACCESS-SIGNATURE': sign,
          'FC-ACCESS-TIMESTAMP': time,
          'Content-Type': 'application/json;charset=UTF-8'
        }
      }).then(res => res.json()).then(res => {
        if (!res.data) {
          console.log(res)
          return {}
        }
        return res.data
      }).catch(e => {
        console.log(e)
        return {}
      })
    }

    async cancelOrder(id) {
      let time = await this.getTime()
      let url = getUrl(`/v3/contracts/orders/${id}/cancel`)
      // let queryStr = this.getQueryString(body)
      let sign = this.secret(`POST${url}${time}`)
      return fetch(url, {
        method: 'POST',
        headers: {
          'FC-ACCESS-KEY': this.config.key,
          'FC-ACCESS-SIGNATURE': sign,
          'FC-ACCESS-TIMESTAMP': time,
          'Content-Type': 'application/json;charset=UTF-8' 
        }
      }).then(res => res.json()).then(res => {
        if (!res.data) {
          console.log(res)
          return {}
        }
        return res.data
      }).catch(e => {
        console.log(e)
        return {}
      })
    }

    async getMatches(id) {
      let time = await this.getTime()
      let url = getUrl(`/v3/contracts/orders/${id}/matches`)
      // let queryStr = this.getQueryString(body)
      let sign = this.secret(`GET${url}${time}`)
      return fetch(url, {
        method: 'GET',
        headers: {
          'FC-ACCESS-KEY': this.config.key,
          'FC-ACCESS-SIGNATURE': sign,
          'FC-ACCESS-TIMESTAMP': time,
          'Content-Type': 'application/json;charset=UTF-8' 
        }
      }).then(res => res.json()).then(res => {
        if (!res.data) {
          console.log(res)
          return {}
        }
        return res.data
      }).catch(e => {
        console.log(e)
        return {}
      })
    }

    async getPosition() {
      let time = await this.getTime()
      let url = getUrl(`/v3/broker/auth/contracts/positions`)
      // let queryStr = this.getQueryString(body)
      let sign = this.secret(`GET${url}${time}`)
      return fetch(url, {
        method: 'GET',
        headers: {
          'FC-ACCESS-KEY': this.config.key,
          'FC-ACCESS-SIGNATURE': sign,
          'FC-ACCESS-TIMESTAMP': time,
          'Content-Type': 'application/json;charset=UTF-8' 
        }
      }).then(res => res.json()).then(res => {
        if (!res.data) {
          console.log(res)
          return {}
        }
        return res.data
      }).catch(e => {
        console.log(e)
        return {}
      })
    }

    async getOrderDetail(id) {
      let time = await this.getTime()
      let url = getUrl(`/v3/contracts/orders/${id}`)
      // let queryStr = this.getQueryString(body)
      let sign = this.secret(`GET${url}${time}`)
      return fetch(url, {
        method: 'GET',
        headers: {
          'FC-ACCESS-KEY': this.config.key,
          'FC-ACCESS-SIGNATURE': sign,
          'FC-ACCESS-TIMESTAMP': time,
          'Content-Type': 'application/json;charset=UTF-8' 
        }
      }).then(res => res.json()).then(res => {
        if (!res.data) {
          console.log(res)
          return {}
        }
        return res.data
      }).catch(e => {
        console.log(e)
        return {}
      })
    }

    async getCandle(symbol, resolution, limit = 20) {
      let url = getUrl(`/v2/market/candles/${resolution}/${symbol}?limit=${limit}`)
      return fetch(url, {
        method: 'GET',
      }).then(res => res.json()).then(res => {
        if (!res.data) {
          console.log(res)
          return {}
        }
        return res.data
      }).catch(e => {
        console.log(e)
        return {}
      })
    }

    async cancelAllOrders(symbol = 'btcusd_p') {
      let time = await this.getTime()
      let url = getUrl(`/v3/contracts/orders/cancel?symbol=${symbol}`)
      // let queryStr = this.getQueryString(body)
      let sign = this.secret(`POST${url}${time}`)
      return fetch(url, {
        method: 'POST',
        headers: {
          'FC-ACCESS-KEY': this.config.key,
          'FC-ACCESS-SIGNATURE': sign,
          'FC-ACCESS-TIMESTAMP': time,
          'Content-Type': 'application/json;charset=UTF-8' 
        }
      }).then(res => res.json()).then(res => {
        if (!res.data) {
          console.log(res)
          return {}
        }
        return res.data
      }).catch(e => {
        console.log(e)
        return {}
      })
    }

  
}

module.exports = FMex;