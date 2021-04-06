const Web3 = require('web3')
const fs = require('fs')
const { exec } = require('child_process')

const createWeb3 = () => new Web3('ws://localhost:8545')

const initWeb3Instance = async (): Promise<typeof Web3> => (
  new Promise((resolve, reject) => {
    const firstAttemptWeb3 = createWeb3()
    firstAttemptWeb3.eth.net.isListening((err: Error) => {
      if(err){
        console.log('Ganache not running on port 8545, starting now...')
        exec('npm run start-ganache', { stdio: 'ignore' })
        const intvl = setInterval(() => {
          const web3 = createWeb3()
          web3.eth.net.isListening((err: Error) => {
            if(err) return
            console.log('Connected.')
            clearInterval(intvl)
            resolve(web3)
          })
        }, 1000)
      } else {
        resolve(firstAttemptWeb3)
      }
    })
  })
)

function logResults(results: { [candidate: string]: number }){
  const [winningVotes, winningCandidates] = Object.entries(results)
    .reduce<[number, Array<string>]>(([voteMax, candidates], [candidate, votes]) => {
      if(votes > voteMax){
        return [votes, [candidate]]
      } else if(votes === voteMax){
        return [votes, [...candidates, candidate]]
      } else {
        return [voteMax, candidates]
      }
    }, [-1, []])
  
  console.log('')
  if(winningCandidates.length === 1){
    console.log(`${winningCandidates[0]} won with ${winningVotes} votes!`)
  } else if(winningCandidates.length > 1){
    const winnersP1 = winningCandidates.slice(0, winningCandidates.length - 1)
    const lastWinner = winningCandidates[winningCandidates.length - 1]
    console.log(`${winnersP1.join(', ')} and ${lastWinner} tied with ${winningVotes} votes!`)
  } else {
    console.log(`No votes received for any candidates?`)
  }
}

function deployContract(web3: typeof Web3, userAccounts: Array<string>){
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
      from: userAccounts[0], // arbitrary account to 
      gas: 2000000,
      gasPrice: web3.utils.toWei('0.00003', 'ether')
    })
    .then((newContract: typeof Web3.eth.Contract) => {
      contract.options.address = newContract.options.address
      console.log(`Contract address: ${contract.options.address}\n`)

      const voteForRandomCandidate = (userAccount: string) => {
        const candidate = candidates[Math.round(Math.random() * candidates.length)]
        contract.methods.voteForCandidate(web3.utils.asciiToHex(candidate))
          .send({ from: userAccount })
          .then(({ transactionHash, gasUsed }: { transactionHash: string, gasUsed: number }) => {
            console.log(`Account ${userAccount} voted for candidate ${candidate}.\nTrasaction: ${transactionHash} Gas Used: ${gasUsed}\n`)
          })
      }

      const getVoteResults = async () => {
        const results: { [candidate: string]: number } = { }
        candidates.forEach((candidate, i) => {
          contract.methods
            .getTotalVotesFor(web3.utils.asciiToHex(candidate))
            .call((err: Error, n: number) => {
              console.log(`Candidate ${candidate} received ${n} votes!`)
              results[candidate] = n
              if(Object.keys(results).length === candidates.length){
                logResults(results)
              }
            })
        })
      }

      console.log('\n')
      let i = 0;
      const voteIntvl = setInterval(() => {
        if(i === userAccounts.length){
          clearInterval(voteIntvl)
          getVoteResults()
        } else {
          voteForRandomCandidate(userAccounts[i])
          i++
        }
      }, 1000)
    })
}

function main(){
  console.log('\nCompiling contract...')
  exec('npm run build', { stdio: 'pipe' }, async (err: Error | null) => {
    if(err) throw err
    console.log('Compiled successfully.')

    const web3 = await initWeb3Instance()
    web3.eth.getAccounts((err: Error | null, accounts: Array<string>) => {
      if(err) throw err
      deployContract(web3, accounts)
    })
  })
}

main()