const Web3 = require('web3')

// Imports
const contracts = require('./utils/contracts')
const utils = require('./utils/utils')

let quest,
    token

let owner
let user1
let user2

const web3 = new Web3()

const timeTravel = async timeDiff => {
    await utils.timeTravel(timeDiff)
}

const getValidQuestParams = () => {
    const id = web3.utils.fromUtf8('123')
    const entryFee = web3.utils.toWei('100', 'ether')
    const timeToComplete = 60 * 60
    const prize = web3.utils.toWei('500', 'ether')

    return {
        id,
        entryFee,
        timeToComplete,
        prize
    }
}

contract('Options', accounts => {
    it('initializes quest contract', async () => {
        owner = accounts[0]
        user1 = accounts[1]
        user2 = accounts[2]

        quest = await contracts.Quest.deployed()
        token = await contracts.DBETVETToken.deployed()
    })

    it('throws if non-owners add an admin', async () => {
        await utils.assertFail(
            quest.addAdmin(user2, {from: user1})
        )
    })

    it('allows owners to add admins', async () => {
        await quest.addAdmin(user2, {from: owner})
        const isUser2Admin = await quest.admins(user2)
        assert.equal(
            isUser2Admin,
            true
        )
    })

    it('throws if non-owners remove admins', async () => {
        await utils.assertFail(
            quest.removeAdmin(user2, {from: user1})
        )
    })

    it('allows owners to remove admins', async () => {
        await quest.removeAdmin(user2, {from: owner})

        const isUser2Admin = await quest.admins(user2)

        assert.equal(
            isUser2Admin,
            false
        )
    })

    it('throws if non-owner sets platform wallet', async () => {
        await utils.assertFail(
            quest.setPlatformWallet(
                user2,
                {
                    from: user1
                }
            )
        )
    })

    it('allows owner to set platform wallet', async () => {
        await quest.setPlatformWallet(
            user2,
            {
                from: owner
            }
        )

        const platformWallet = await quest.platformWallet()
        assert.equal(
            platformWallet,
            user2
        )
    })

    it('throws if non-admin adds quest', async () => {
        const {
            id,
            entryFee,
            timeToComplete,
            prize
        } = getValidQuestParams()

        await utils.assertFail(
            quest.addQuest(
                id,
                entryFee,
                timeToComplete,
                prize,
                {
                    from: user2
                }
            )
        )
    })

    it('throws if admin adds quest with invalid data', async () => {
        const {
            id,
            entryFee,
            timeToComplete,
            prize
        } = getValidQuestParams()

        const invalidValue = 0

        // Invalid id
        await utils.assertFail(
            quest.addQuest(
                invalidValue,
                entryFee,
                timeToComplete,
                prize
            )
        )

        // Invalid entryFee
        await utils.assertFail(
            quest.addQuest(
                id,
                invalidValue,
                timeToComplete,
                prize
            )
        )

        // Invalid timeToComplete
        await utils.assertFail(
            quest.addQuest(
                id,
                entryFee,
                invalidValue,
                prize
            )
        )

        // Invalid prize
        await utils.assertFail(
            quest.addQuest(
                id,
                entryFee,
                timeToComplete,
                invalidValue
            )
        )
    })

    it('allows admins to add quests', async () => {
        const {
            id,
            entryFee,
            timeToComplete,
            prize
        } = getValidQuestParams()

        await quest.addQuest(
            id,
            entryFee,
            timeToComplete,
            prize
        )

        const questData = await quest.quests(id)

        assert.equal(
            questData[3],
            true
        )
    })

    it('throws if admin adds quest with an existing id', async () => {
        const {
            id,
            entryFee,
            timeToComplete,
            prize
        } = getValidQuestParams()

        await utils.assertFail(
            quest.addQuest(
                id,
                entryFee,
                timeToComplete,
                prize
            )
        )
    })

    it('throws if user pays for non-existent quest id', async () => {
        await utils.assertFail(
            quest.payForQuest(
                'invalid',
                {
                    from: user1
                }
            )
        )
    })

    it('throws if user pays for quest id without a sufficient balance and/or allowance', async () => {
        const {id} = getValidQuestParams()
        // Invalid balance
        await utils.assertFail(
            quest.payForQuest(
                id,
                {
                    from: user1
                }
            )
        )

        // Transfer DBETs to user1
        await token.transfer(
            user1,
            web3.utils.toWei('10000', 'ether')
        )

        // Invalid allowance
        await utils.assertFail(
            quest.payForQuest(
                id,
                {
                    from: user1
                }
            )
        )
    })

    it('allows user to pay for quest with a sufficient balance and allowance', async () => {
        // Approve quest contract to send user1's tokens
        await token.approve(
            quest.options.address,
            web3.utils.toWei('100000', 'ether'),
            {
                from: user1
            }
        )

        const {id} = getValidQuestParams()

        // Pay for quest with sufficient allowance and balance
        await quest.payForQuest(
            id,
            {
                from: user1
            }
        )

        // Check if user entry exists
        const userQuestEntry = await quest.userQuestEntries(
            user1,
            id
        )
        assert.equal(
            userQuestEntry[2],
            true
        )
    })

    it('throws if user pays for quest id that has already been started', async () => {
        const {id} = getValidQuestParams()
        await utils.assertFail(
            quest.payForQuest(
                id
            )
        )
    })

})