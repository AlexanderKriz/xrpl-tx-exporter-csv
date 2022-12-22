const {XrplClient} = require('xrpl-client')
const {parseBalanceChanges} = require('ripple-lib-transactionparser')

const app = async (account, cb, returnTx) => {
  const display = result => {
    if (result?.transactions) {
      result?.transactions.forEach(r => {
        const {tx, meta} = r
        let direction = 'other'
        if (tx?.Account === account) direction = 's'
        if (tx?.Destination === account) direction = 'r'
        const moment = (new Date((tx.date + 946684800) * 1000)).toISOString().split('.')[0] + 'Z'
        const balanceChanges = parseBalanceChanges(meta)
        if (Object.keys(balanceChanges).indexOf(account) > -1) {
          const mutations = balanceChanges[account]
          mutations.forEach(mutation => {
            const currency = mutation.counterparty === ''
              ? 'XRP'
              : `${mutation.counterparty}.${mutation.currency}`

            const isFee = direction === 's' && Number(mutation.value) * -1 * 1000000 === Number(tx?.Fee)
              ? 1
              : 0

              const fee = direction === 's'
              ? Number(tx?.Fee) / 1000000 * -1
              : 0

            cb({
              date: moment,
              direction: direction,
              txtype: tx.TransactionType,
              currency: currency,
              amount: mutation.value,
              is_fee: isFee,
              _tx: returnTx ? tx : undefined,
              _meta: returnTx ? meta : undefined
            })
          })
        }
      })
    }
  }

  const client = new XrplClient('wss://xrpl.ws/')

  const getMore = async marker => {
    const result = await client.send({
      command: 'account_tx',
      account,
      limit: 100,
      marker
    })
  
    display(result)
    return result?.marker
  }

  let proceed = await getMore()

  while (proceed) {
    proceed = await getMore(proceed)
  }

  client.close()
}

const fields = [
  'date',
  'direction',
  'txtype',
  'currency',
  'amount',
  'is_fee',
]

module.exports = {
  app,
  fields
}
