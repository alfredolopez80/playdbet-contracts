require('dotenv')
const fs = require('fs')
const appRoot = require('app-root-path')
const ContractImportBuilder = require(`@decent-bet/connex-entity-builder`)
const constants = require(`${appRoot}/lib/constants`)
const PostMigration = require('./post-migration')

function MigrationScript(web3, contractManager, deployer, builder, args) {
    let defaultAccount
    let platformWallet

    let admin,
        dbetNode,
        nodeWallet,
        quest,
        token,
        tournament

    const TOKEN_NAME = 'Decent.bet Token'
    const TOKEN_SYMBOL = 'DBET'
    const TOKEN_DECIMALS = 18
    const TOTAL_DBET_SUPPLY = '205903294831970956466297922'

    const getAccounts = () => {
        return web3.eth.accounts.wallet
    }

    const getDefaultOptions = from => {
        return {
            from: from ? from : defaultAccount,
            gas: 8000000
        }
    }

    // Migration script
    this.migrate = async chain => {
        let accounts = await getAccounts()
        defaultAccount = accounts[0].address
        console.log('Available accounts', accounts.length, accounts)
        console.log(
            'Migrating contracts. Available energy:',
            web3.utils.fromWei(await web3.eth.getEnergy(defaultAccount), 'ether')
        )

        try {
            if(chain === constants.CHAIN_SOLO) {
                const Admin = contractManager.getContract('Admin')
                const DBETNode = contractManager.getContract('DBETNode')
                const DecentBetToken = contractManager.getContract('DBETVETToken')
                const Quest = contractManager.getContract('Quest')
                const Tournament = contractManager.getContract('Tournament')

                const bootstrapTokenAmount = web3.utils.toWei(
                    '10000000',
                    'ether'
                )

                platformWallet = defaultAccount
                // Deploy the DecentBetToken contract
                token = await deployer.deploy(
                    DecentBetToken,
                    TOKEN_NAME,
                    TOKEN_SYMBOL,
                    TOKEN_DECIMALS,
                    TOTAL_DBET_SUPPLY,
                    getDefaultOptions()
                )
                console.log('Deployed token')

                // Deploy the Admin contract
                admin = await deployer.deploy(
                    Admin,
                    getDefaultOptions()
                )
                console.log('Deployed admin')
                // Set the platform wallet in admin
                await admin.methods.setPlatformWallet(platformWallet).send(getDefaultOptions())
                console.log('Set platform wallet', platformWallet)
                await token.methods.transfer(
                    platformWallet,
                    bootstrapTokenAmount
                ).send(getDefaultOptions())
                console.log('Transferred', bootstrapTokenAmount, 'DBETs to platform wallet:', platformWallet)

                if(process.env.ADMIN_ADDRESS) {
                    const adminAddress = process.env.ADMIN_ADDRESS
                    console.log(`Adding ${adminAddress} as admin`)
                    await admin.methods.addAdmin(adminAddress).send(getDefaultOptions())
                    console.log('Added admin', adminAddress)
                    await token.methods.transfer(
                        adminAddress,
                        bootstrapTokenAmount
                    ).send(getDefaultOptions())
                    console.log('Transferred', bootstrapTokenAmount, 'DBETs to admin:', adminAddress)
                }
                // Deploy the DBETNode contract
                console.log('Deploying DBET node', admin.options.address, token.options.address)
                dbetNode = await deployer.deploy(
                    DBETNode,
                    admin.options.address,
                    token.options.address,
                    getDefaultOptions()
                )
                console.log('Deployed DBET node')

                // Deploy the Quest contract
                quest = await deployer.deploy(
                    Quest,
                    admin.options.address,
                    token.options.address,
                    dbetNode.options.address,
                    getDefaultOptions()
                )
                console.log('Deployed quest')
                // Approve quest contract to transfer tokens from platform wallet
                await token.methods.approve(
                    quest.options.address,
                    bootstrapTokenAmount
                ).send(getDefaultOptions())
                console.log('Approved transfer of', bootstrapTokenAmount, 'DBETs to Quest contract:', quest.options.address)

                // Deploy the Tournament contract
                tournament = await deployer.deploy(
                    Tournament,
                    admin.options.address,
                    token.options.address,
                    dbetNode.options.address,
                    getDefaultOptions()
                )
                console.log('Deployed tournament')
                // Approve tournament contract to transfer tokens from platform wallet
                await token.methods.approve(
                    tournament.options.address,
                    bootstrapTokenAmount
                ).send(getDefaultOptions())

                console.log('Setting DBET node contracts', quest.options.address, tournament.options.address)
                // Set contract addresses in the DBET Node contract
                await dbetNode.methods.setContracts(
                    quest.options.address,
                    tournament.options.address
                ).send(getDefaultOptions())

                const nodeWalletAddress = await dbetNode.methods.nodeWallet().call()
                const NodeWallet = contractManager.getContract(
                    'NodeWallet',
                    nodeWalletAddress
                )
                nodeWallet = new web3.eth.Contract(
                    NodeWallet._jsonInterface,
                    nodeWalletAddress
                )

                console.log(
                    'Deployed:',
                    '\nAdmin: ' + admin.options.address,
                    '\nDBETNode: ' + dbetNode.options.address,
                    '\nNodeWallet: ' + nodeWallet.options.address,
                    '\nQuest: ' + quest.options.address,
                    '\nToken: ' + token.options.address,
                    '\nTournament: ' + tournament.options.address
                )

                builder.onWrite = (output) => {
                    fs.writeFileSync(`${appRoot}/npm/index.js`, output)
                }

                builder.addContract("AdminContract", Admin, admin.options.address, chain)
                builder.addContract("DBETNode", DBETNode, dbetNode.options.address, chain)
                builder.addContract("NodeWallet", NodeWallet, nodeWallet.options.address, chain)
                builder.addContract("QuestContract", Quest, quest.options.address, chain)
                builder.addContract("DBETVETTokenContract", DecentBetToken, token.options.address, chain)
                builder.addContract("TournamentContract", Tournament, tournament.options.address, chain)

                const postMigration = new PostMigration(
                    web3,
                    defaultAccount,
                    {
                        admin,
                        quest,
                        token,
                        tournament
                    }
                )
                await postMigration.run()
            } else if (chain === constants.CHAIN_TESTNET) {
                const tokenAddress = require('../../npm').DBETVETTokenContract.address["0x27"]
                const bootstrapTokenAmount = web3.utils.toWei(
                    '1000000',
                    'ether'
                )
                platformWallet = defaultAccount

                const getContract = (
                    name,
                    address
                ) => {
                    const contract = require(`${appRoot}/npm`)[`${name}Contract`]
                    const json = require(`${appRoot}/build/contracts/${name}`)
                    return {
                        contract: address ?
                            new web3.eth.Contract(
                                contract.raw.abi,
                                address
                            ) :
                            new web3.eth.Contract(
                                contract.raw.abi
                            ),
                        json
                    }
                }

                const Admin = contractManager.getContract('Admin')
                const DBETNode = contractManager.getContract('DBETNode')
                const DecentBetToken = getContract('DBETVETToken', tokenAddress)
                const Quest = contractManager.getContract('Quest')
                const Tournament = contractManager.getContract('Tournament')

                let token = DecentBetToken.contract
                console.log(
                    'Platform wallet token balance',
                    web3.utils.fromWei(
                        await token.methods.balanceOf(platformWallet).call(),
                        'ether'
                    )
                )

                // Deploy the Admin contract
                admin = await deployer.deploy(
                    Admin,
                    getDefaultOptions()
                )
                console.log('Deployed admin', admin.options.address)
                // Set the platform wallet in admin
                const setPlatformWalletTx = await admin.methods.setPlatformWallet(platformWallet).send(getDefaultOptions())
                console.log('Set platform wallet', platformWallet, setPlatformWalletTx)

                // Deploy the DBETNode contract
                console.log('Deploying DBET node', admin.options.address, token.options.address)
                dbetNode = await deployer.deploy(
                    DBETNode,
                    admin.options.address,
                    token.options.address,
                    getDefaultOptions()
                )
                console.log('Deployed DBET node')

                // Deploy the Quest contract
                quest = await deployer.deploy(
                    Quest,
                    admin.options.address,
                    token.options.address,
                    dbetNode.options.address,
                    getDefaultOptions()
                )
                console.log('Deployed quest')
                // Approve quest contract to transfer tokens from platform wallet
                await token.methods.approve(
                    quest.options.address,
                    bootstrapTokenAmount
                ).send(getDefaultOptions(platformWallet))
                console.log('Approved transfer of', bootstrapTokenAmount, 'DBETs to Quest contract:', quest.options.address)

                // Deploy the Tournament contract
                tournament = await deployer.deploy(
                    Tournament,
                    admin.options.address,
                    token.options.address,
                    dbetNode.options.address,
                    getDefaultOptions()
                )
                console.log('Deployed tournament')
                // Approve tournament contract to transfer tokens from platform wallet
                await token.methods.approve(
                    tournament.options.address,
                    bootstrapTokenAmount
                ).send(getDefaultOptions(platformWallet))

                console.log('Setting DBET node contracts', quest.options.address, tournament.options.address)
                // Set contract addresses in the DBET Node contract
                await dbetNode.methods.setContracts(
                    quest.options.address,
                    tournament.options.address
                ).send(getDefaultOptions())

                const nodeWalletAddress = await dbetNode.methods.nodeWallet().call()
                const NodeWallet = contractManager.getContract(
                    'NodeWallet',
                    nodeWalletAddress
                )
                nodeWallet = new web3.eth.Contract(
                    NodeWallet._jsonInterface,
                    nodeWalletAddress
                )

                console.log(
                    'Deployed:',
                    '\nAdmin: ' + admin.options.address,
                    '\nDBETNode: ' + dbetNode.options.address,
                    '\nNodeWallet: ' + nodeWallet.options.address,
                    '\nQuest: ' + quest.options.address,
                    '\nTournament: ' + tournament.options.address
                )

                builder.onWrite = (output) => {
                    fs.writeFileSync(`${appRoot}/npm/index.js`, output)
                }

                builder.addContract("AdminContract", Admin, admin.options.address, chain)
                builder.addContract("DBETNode", DBETNode, dbetNode.options.address, chain)
                builder.addContract("NodeWallet", NodeWallet, nodeWallet.options.address, chain)
                builder.addContract("QuestContract", Quest, quest.options.address, chain)
                builder.addContract("DBETVETTokenContract", DecentBetToken, token.options.address, chain)
                builder.addContract("TournamentContract", Tournament, tournament.options.address, chain)
            } else if (chain === constants.CHAIN_MAIN) {
                const tokenAddress = require('../../npm').DBETVETTokenContract.address["0x4a"]
                const bootstrapTokenAmount = web3.utils.toWei(
                    '1000000',
                    'ether'
                )
                platformWallet = accounts[1].address

                const getContract = (
                    name,
                    address
                ) => {
                    const contract = require(`${appRoot}/npm`)[`${name}Contract`]
                    const json = require(`${appRoot}/build/contracts/${name}`)
                    return {
                        contract: address ?
                            new web3.eth.Contract(
                                contract.raw.abi,
                                address
                            ) :
                            new web3.eth.Contract(
                                contract.raw.abi
                            ),
                        json
                    }
                }

                const Admin = contractManager.getContract('Admin')
                const DBETNode = contractManager.getContract('DBETNode')
                const DecentBetToken = getContract('DBETVETToken', tokenAddress)
                const Quest = contractManager.getContract('Quest')
                const Tournament = contractManager.getContract('Tournament')

                let token = DecentBetToken.contract
                console.log(
                    'Platform wallet token balance',
                    web3.utils.fromWei(
                        await token.methods.balanceOf(platformWallet).call(),
                        'ether'
                    )
                )

                // Deploy the Admin contract
                admin = await deployer.deploy(
                    Admin,
                    getDefaultOptions()
                )
                console.log('Deployed admin', admin.options.address)
                // Set the platform wallet in admin
                const setPlatformWalletTx = await admin.methods.setPlatformWallet(platformWallet).send(getDefaultOptions())
                console.log('Set platform wallet', platformWallet, setPlatformWalletTx)

                // Deploy the DBETNode contract
                console.log('Deploying DBET node', admin.options.address, token.options.address)
                dbetNode = await deployer.deploy(
                    DBETNode,
                    admin.options.address,
                    token.options.address,
                    getDefaultOptions()
                )
                console.log('Deployed DBET node')

                // Deploy the Quest contract
                quest = await deployer.deploy(
                    Quest,
                    admin.options.address,
                    token.options.address,
                    dbetNode.options.address,
                    getDefaultOptions()
                )
                console.log('Deployed quest')
                // Approve quest contract to transfer tokens from platform wallet
                await token.methods.approve(
                    quest.options.address,
                    bootstrapTokenAmount
                ).send(getDefaultOptions(platformWallet))
                console.log('Approved transfer of', bootstrapTokenAmount, 'DBETs to Quest contract:', quest.options.address)

                // Deploy the Tournament contract
                tournament = await deployer.deploy(
                    Tournament,
                    admin.options.address,
                    token.options.address,
                    dbetNode.options.address,
                    getDefaultOptions()
                )
                console.log('Deployed tournament')
                // Approve tournament contract to transfer tokens from platform wallet
                await token.methods.approve(
                    tournament.options.address,
                    bootstrapTokenAmount
                ).send(getDefaultOptions(platformWallet))

                console.log('Setting DBET node contracts', quest.options.address, tournament.options.address)
                // Set contract addresses in the DBET Node contract
                await dbetNode.methods.setContracts(
                    quest.options.address,
                    tournament.options.address
                ).send(getDefaultOptions())

                const nodeWalletAddress = await dbetNode.methods.nodeWallet().call()
                const NodeWallet = contractManager.getContract(
                    'NodeWallet',
                    nodeWalletAddress
                )
                nodeWallet = new web3.eth.Contract(
                    NodeWallet._jsonInterface,
                    nodeWalletAddress
                )

                console.log(
                    'Deployed:',
                    '\nAdmin: ' + admin.options.address,
                    '\nDBETNode: ' + dbetNode.options.address,
                    '\nNodeWallet: ' + nodeWallet.options.address,
                    '\nQuest: ' + quest.options.address,
                    '\nTournament: ' + tournament.options.address
                )

                builder.onWrite = (output) => {
                    fs.writeFileSync(`${appRoot}/npm/index.js`, output)
                }

                builder.addContract("AdminContract", Admin, admin.options.address, chain)
                builder.addContract("DBETNode", DBETNode, dbetNode.options.address, chain)
                builder.addContract("NodeWallet", NodeWallet, nodeWallet.options.address, chain)
                builder.addContract("QuestContract", Quest, quest.options.address, chain)
                builder.addContract("DBETVETTokenContract", DecentBetToken, token.options.address, chain)
                builder.addContract("TournamentContract", Tournament, tournament.options.address, chain)
            }
        } catch (e) {
            console.log('Error deploying contracts:', e.message, e.stack)
        }
    }
}

module.exports = (web3, dbet, deployer, args) => {
    const builder = new ContractImportBuilder();
    builder.setOutput(`${appRoot}/npm/index.js`);
    return new MigrationScript(web3, dbet, deployer, builder, args)
}
