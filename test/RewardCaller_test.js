const RewardCaller = artifacts.require('RewardCaller')
const Token = artifacts.require('Token')
const MockTarget = artifacts.require('MockTarget')
const MockDeepTarget = artifacts.require('MockDeepTarget')
const { 
  expectEvent,
  expectRevert,
  time,
} = require('@openzeppelin/test-helpers')

contract('RewardCaller', (accounts) => {
  const maintainer = accounts[0]
  const user = accounts[1]
  const stranger = accounts[2]

  const rewardAmount = 10
  const callerLockoutPeriod = 300
  const data = '0xa341a91b'
  const name = 'Test Token'
  const symbol = 'SYM'

  let rewardCaller, token, mockTarget, mockDeepTarget

  beforeEach(async () => {
    token = await Token.new(
      name,
      symbol,
    )
    mockTarget = await MockTarget.new(
      { from: maintainer },
    )
    mockDeepTarget = await MockDeepTarget.new(
      { from: maintainer },
    )
    rewardCaller = await RewardCaller.new(
      token.address,
      rewardAmount,
      callerLockoutPeriod,
      mockTarget.address,
      data,
      { from: maintainer },
    )
    await token.transfer(
      rewardCaller.address,
      10000,
    )
  })

  describe('constructor', () => {
    it('deploys with expected state', async () => {
      assert.equal(token.address, await rewardCaller.rewardToken())
      assert.equal(rewardAmount, await rewardCaller.rewardAmount())
      assert.equal(callerLockoutPeriod, await rewardCaller.callerLockoutPeriod())
      const transaction = await rewardCaller.transaction()
      assert.equal(data, transaction.data)
      assert.equal(mockTarget.address, transaction.target)
      const called = await time.latest()
      assert.isTrue(called.eq(await rewardCaller.lastCalled()))
    })
  })

  describe('callFunction', () => {
    context('when the function is not callable', () => {
      it('reverts', async () => {
        assert.isFalse(await rewardCaller.canCallFunction())
        await expectRevert(
          rewardCaller.callFunction({ from: user }),
          '!canCallFunction',
        )
      })
    })

    context('when the function is callable', () => {
      beforeEach(async () => {
        await time.increase(callerLockoutPeriod)
        assert.isTrue(await rewardCaller.canCallFunction())
      })

      it('calls the target function and rewards the caller', async () => {
        assert.equal(0, await token.balanceOf(user))
        const { tx } = await rewardCaller.callFunction({ from: user })
        await expectEvent.inTransaction(tx, MockTarget, 'Called')
        assert.equal(rewardAmount, await token.balanceOf(user))
      })

      context('when data is used', () => {
        let newData

        beforeEach(async () => {
          newData = web3.eth.abi.encodeFunctionCall({
            name: 'targetFunctionWithData',
            type: 'function',
            inputs: [{
              name: '_addr',
              type: 'address',
            }],
          }, [stranger])
          await rewardCaller.setTransactionDetails(mockTarget.address, newData, { from: maintainer })
          await time.increase(callerLockoutPeriod)
          assert.isTrue(await rewardCaller.canCallFunction())
        })

        it('calls the target function and rewards the caller', async () => {
          assert.equal(0, await token.balanceOf(user))
          const { tx } = await rewardCaller.callFunction({ from: user })
          await expectEvent.inTransaction(tx, MockTarget, 'CalledWithData', {
            addr: stranger,
          })
          assert.equal(rewardAmount, await token.balanceOf(user))
        })
      })

      context('when the target function fails', () => {
        const newData = '0x3290dea5'

        beforeEach(async () => {
          await rewardCaller.setTransactionDetails(mockTarget.address, newData, { from: maintainer })
          await time.increase(callerLockoutPeriod)
          assert.isTrue(await rewardCaller.canCallFunction())
        })

        it('reverts', async () => {
          assert.isTrue(await rewardCaller.canCallFunction())
          await expectRevert(
            rewardCaller.callFunction({ from: user }),
            '!success',
          )
        })
      })

      context('when the deep target function fails', () => {
        let newData

        beforeEach(async () => {
          newData = web3.eth.abi.encodeFunctionCall({
            name: 'targetFunctionCallDeepTarget',
            type: 'function',
            inputs: [{
              name: '_target',
              type: 'address',
            },{
              name: '_data',
              type: 'bytes',
            }],
          }, [mockDeepTarget.address, '0x3290dea5'])
          await rewardCaller.setTransactionDetails(mockTarget.address, newData, { from: maintainer })
          await time.increase(callerLockoutPeriod)
          assert.isTrue(await rewardCaller.canCallFunction())
        })

        it('calls the target function and rewards the caller', async () => {
          assert.equal(0, await token.balanceOf(user))
          const { tx } = await rewardCaller.callFunction({ from: user })
          await expectEvent.inTransaction(tx, MockTarget, 'Called')
          assert.equal(rewardAmount, await token.balanceOf(user))
        })
      })
    })

    context('after the function has been called', () => {
      beforeEach(async () => {
        await time.increase(callerLockoutPeriod)
        await rewardCaller.callFunction({ from: user })
        assert.isFalse(await rewardCaller.canCallFunction())
      })

      it('cannot be called again until the lockDuration has passed', async () => {
        await expectRevert(
          rewardCaller.callFunction({ from: user }),
          '!canCallFunction',
        )
        await time.increase(callerLockoutPeriod)
        const { tx } = await rewardCaller.callFunction({ from: user })
        await expectEvent.inTransaction(tx, MockTarget, 'Called')
      })
    })
  })

  describe('setRewardDetails', () => {
    const newLockoutPeriod = 301
    const newRewardAmount = 11

    context('before the DETAILS_LOCK_PERIOD has passed', () => {
      it('reverts', async () => {
        await expectRevert(
          rewardCaller.setRewardDetails(
            newLockoutPeriod,
            newRewardAmount,
            { from: maintainer },
          ),
          '!setRewardDetails'
        )
      })
    })

    context('after the DETAILS_LOCK_PERIOD has passed', () => {
      beforeEach(async () => {
        await time.increase(2592000) // 30 days
      })

      context('when called by a stranger', () => {
        it('reverts', async () => {
          await expectRevert(
            rewardCaller.setRewardDetails(
              newLockoutPeriod,
              newRewardAmount,
              { from: stranger },
            ),
            'Ownable: caller is not the owner'
          )
        })
      })

      context('when called by the owner', () => {
        it('updates the state', async () => {
          await rewardCaller.setRewardDetails(
            newLockoutPeriod,
            newRewardAmount,
            { from: maintainer },
          )
          assert.equal(newLockoutPeriod, await rewardCaller.callerLockoutPeriod())
          assert.equal(newRewardAmount, await rewardCaller.rewardAmount())
        })
      })
    })
  })

  describe('setTransactionDetails', () => {
    let newData, newTarget

    beforeEach(async () => {
      newTarget = await MockTarget.new()
      newData = web3.eth.abi.encodeFunctionCall({
        name: 'targetFunctionWithData',
        type: 'function',
        inputs: [{
          name: '_addr',
          type: 'address',
        }],
      }, [stranger])
    })

    context('when called by a stranger', () => {
      it('reverts', async () => {
        await expectRevert(
          rewardCaller.setTransactionDetails(
            newTarget.address,
            newData,
            { from: stranger },
          ),
          'Ownable: caller is not the owner'
        )
      })
    })

    context('when called by the owner', () => {
      it('updates the state', async () => {
        await rewardCaller.setTransactionDetails(
          newTarget.address,
          newData,
          { from: maintainer },
        )
        const transaction = await rewardCaller.transaction()
        assert.equal(newData, transaction.data)
        assert.equal(newTarget.address, transaction.target)
      })
    })
  })

  describe('withdraw', () => {
    context('when called by a stranger', () => {
      it('reverts', async () => {
        await expectRevert(
          rewardCaller.withdraw(
            stranger,
            1,
            { from: stranger },
          ),
          'Ownable: caller is not the owner'
        )
      })
    })

    context('when called by the owner', () => {
      it('updates the state', async () => {
        await rewardCaller.withdraw(
          stranger,
          1,
          { from: maintainer },
        )
        assert.equal(1, await token.balanceOf(stranger))
      })
    })
  })
})
