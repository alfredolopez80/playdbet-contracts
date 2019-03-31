require('dotenv')
const fs = require('fs')
const appRoot = require('app-root-path')
const ContractImportBuilder = require(`@decent-bet/connex-entity-builder`)
const constants = require(`${appRoot}/lib/constants`)
const PostMigration = require('./post-migration')

function MigrationScript(web3, contractManager, deployer, builder, args) {
    let defaultAccount

    let admin,
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

    const getDefaultOptions = () => {
        return {
            from: defaultAccount,
            gas: 4000000
        }
    }

    // Migration script
    this.migrate = async (chain) => {
        const Admin = contractManager.getContract('Admin')
        const DecentBetToken = contractManager.getContract('DBETVETToken')
        const Quest = contractManager.getContract('Quest')
        const Tournament = contractManager.getContract('Tournament')

        let accounts = await getAccounts()
        defaultAccount = accounts[0].address
        console.log('Available accounts', accounts.length, defaultAccount)

        try {
            if(chain === constants.CHAIN_SOLO || chain === constants.CHAIN_TESTNET) {
                const platformWallet = require(`${appRoot}/vet-config`).chains.testnet.from
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
                console.log('Setting platform wallet:', platformWallet)
                await admin.setPlatformWallet(platformWallet)

                console.log('Admin address', process.env)
                if(process.env.ADMIN_ADDRESS) {
                    const adminAddress = process.env.ADMIN_ADDRESS
                    console.log(`Adding ${adminAddress} as admin`)
                    await admin.addAdmin(adminAddress)
                }

                // Deploy the Quest contract
                quest = await deployer.deploy(
                    Quest,
                    admin.options.address,
                    token.options.address,
                    getDefaultOptions()
                )
                console.log('Deployed quest')

                // Deploy the Tournament contract
                tournament = await deployer.deploy(
                    Tournament,
                    admin.options.address,
                    token.options.address,
                    getDefaultOptions()
                )
                console.log('Deployed tournament')

                console.log(
                    'Deployed:',
                    '\nAdmin: ' + admin.options.address,
                    '\nQuest: ' + quest.options.address,
                    '\nToken: ' + token.options.address,
                    '\nTournament: ' + tournament.options.address
                )

                builder.onWrite = (output) => {
                    fs.writeFileSync(`${appRoot}/npm/index.js`, output)
                }

                builder.addContract("AdminContract", Admin, admin.options.address, chain);
                builder.addContract("QuestContract", Quest, quest.options.address, chain);
                builder.addContract("DBETVETTokenContract", DecentBetToken, token.options.address, chain);
                builder.addContract("TournamentContract", Tournament, tournament.options.address, chain);


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

            } else if (chain === constants.CHAIN_MAIN) {
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
