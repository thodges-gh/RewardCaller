# RewardCaller

A contract that allows the owner to set a reward for calling a function which triggers another contract.

There are some cases where a project has a contract that must be called on some interval in order for that project to function. This could be to request data from Chainlink, or even to harvest yield for a vault on yearn.finance. In many of these cases, the caller of the function has to pay significant amounts of gas, with no direct reward for doing so. By introducing a reward for calling a function, it makes it easy to decentralize the process of ensuring that function gets called in a timely manner. The advantage of using RewardCaller is that it will likely require no changes to a project's current architecture. Simply set the variables that are required to call the target function.

The owner of the RewardCaller contract can set:
- rewardToken: This is set once only on deployment. It is the token address that will be given to the successful caller as a reward for calling the callFunction() function.
- rewardAmount: This is the amount of the rewardToken that will be provided to the successful caller.
- callerLockoutPeriod: This is the amount of time in between the callFunction() can be called (in seconds).
- targetAddress: This is the address of the contract that will be called by callFunction().
- data: The calldata to send to the target contract (can be just the function signature if no further data is required).

Except for the rewardToken, each of the properties above can be updated by the owner of the RewardCaller contract. However, in order to prevent abuse by the owner, the reward details can only be updated after 30 days since their last update. Note that the owner could still abuse callers by racing them to withdraw funds before the callFunction function is called, but that would likely ruin any relationship between that project owner and callers.

## Install

```
npm install
```

## Test

```
npm test
```
