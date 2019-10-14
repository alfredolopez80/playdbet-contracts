const REWARD_INCREASED_PRIZE_PAYOUTS = 0
const REWARD_INCREASED_REFER_A_FRIEND = 1
const REWARD_CREATE_QUEST = 2
const REWARD_CREATE_PRIVATE_QUEST = 3
const REWARD_CREATE_WHITELIST_QUEST = 4
const REWARD_CREATE_TOURNAMENT = 5

const rewards = [
    REWARD_INCREASED_PRIZE_PAYOUTS,
    REWARD_INCREASED_REFER_A_FRIEND,
    REWARD_CREATE_QUEST,
    REWARD_CREATE_PRIVATE_QUEST,
    REWARD_CREATE_WHITELIST_QUEST,
    REWARD_CREATE_TOURNAMENT
]

const getNode = () => {
    return {
        name: 'House',
        tokenThreshold: web3.utils.toWei('100000', 'ether'), // 100k DBETs
        timeThreshold: 86400 * 7, // 1 week
        maxCount: 10,
        rewards
    }
}

const getValidNodeQuestParams = () => {
    const id = web3.utils.fromUtf8('456')
    const entryFee = web3.utils.toWei('200', 'ether')
    const prize = web3.utils.toWei('1000', 'ether')
    const maxEntries = 100;

    return {
        id,
        entryFee,
        prize,
        maxEntries
    }
}

module.exports = {
    REWARD_INCREASED_PRIZE_PAYOUTS,
    REWARD_INCREASED_REFER_A_FRIEND,
    REWARD_CREATE_QUEST,
    REWARD_CREATE_PRIVATE_QUEST,
    REWARD_CREATE_WHITELIST_QUEST,
    REWARD_CREATE_TOURNAMENT,
    rewards,
    getNode,
    getValidNodeQuestParams
}