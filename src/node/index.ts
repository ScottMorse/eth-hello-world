
const Web3 = require('web3')
const fs = require('fs')
const { exec } = require('child_process')


console.log('Compiling contract...')
exec('npm run build', (err: Error) => {
  if(!err){
    console.log('Compiled successfully.')
    const intvl = setInterval(() => {
      const web3 = new Web3('ws://localhost:8545')
      web3.eth.net.isListening((err: Error) => {
        if(err) return
        clearInterval(intvl)
        web3.eth.getAccounts((err: Error | null, accounts: Array<string>) => {
          if(!err){
            main(web3, accounts[0])
          } else {
            throw err
          }
        })
      })
    }, 1000)
  } else {
    throw err
  }
})

function main(web3: typeof Web3, account: string){
  const buildData = fs.readFileSync('src/sol/build/__src_sol_voting_sol_Voting.bin')
  const abi = JSON.parse(fs.readFileSync('src/sol/build/__src_sol_voting_sol_Voting.abi'))
  
  const contract = new web3.eth.Contract(abi)
  const candidates = ['Birdie', 'Pieden', 'Willary', 'Klump', 'Nitt', 'Parco']

  contract
    .deploy({
      data: buildData,
      arguments: [candidates.map(name => web3.utils.asciiToHex(name))],
    })
    .send({
      from: account,
      gas: 1500000,
      gasPrice: web3.utils.toWei('0.00003', 'ether')
    })
    .then((newContract: typeof Web3.eth.Contract) => {
      contract.options.address = newContract.options.address
      console.log(`Contract address: ${contract.options.address}`)
    })
}