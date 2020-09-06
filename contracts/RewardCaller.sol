pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

/**
 * @title RewardCaller
 * @notice RewardCaller is a contract that allows the owner to set a reward
 * for calling a function which triggers another contract.
 */
contract RewardCaller is Ownable {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;
  IERC20 public immutable rewardToken;
  uint256 public constant DETAILS_LOCK_PERIOD = 30 days;
  uint256 public rewardAmount;
  uint256 public callerLockoutPeriod;
  uint256 public lastCalled;
  uint256 public detailsLastUpdated;

  struct Transaction {
    address target;
    bytes data;
  }
  Transaction public transaction;

  constructor(
    address _rewardToken,
    uint256 _rewardAmount,
    uint256 _callerLockoutPeriod,
    address _targetAddress,
    bytes memory _data
  )
    public
  {
    rewardToken = IERC20(_rewardToken);
    lastCalled = block.timestamp;
    setRewardDetails(_callerLockoutPeriod, _rewardAmount);
    setTransactionDetails(_targetAddress, _data);
  }

  /**
   * @notice Informs callers if callFunction can be called
   * @return bool the callFunction can be called
   */
  function canCallFunction() public view returns (bool) {
    return block.timestamp.sub(lastCalled) >= callerLockoutPeriod
      && rewardToken.balanceOf(address(this)) >= rewardAmount;
  }

  /**
   * @notice Calls a function on an external contract and rewards the caller
   * @return bool if the call was successful
   */
  function callFunction() external returns (bool) {
    require(canCallFunction(), "!canCallFunction");
    lastCalled = block.timestamp;
    ( bool success, ) = transaction.target.call(transaction.data);
    require(success, "!success");
    rewardToken.safeTransfer(msg.sender, rewardAmount);
    return success;
  }

  /**
   * @notice Called by the owner to set the reward details: lockout duration and reward amount
   * @param _callerLockoutPeriod The amount of time in seconds after callFunction can
   * be called again
   * @param _rewardAmount The amount of tokens to provide the successful caller of
   * the callFunction function
   */
  function setRewardDetails(
    uint256 _callerLockoutPeriod,
    uint256 _rewardAmount
  )
    public
    onlyOwner()
  {
    require(block.timestamp.sub(detailsLastUpdated) >= DETAILS_LOCK_PERIOD, "!setRewardDetails");
    detailsLastUpdated = block.timestamp;
    callerLockoutPeriod = _callerLockoutPeriod;
    rewardAmount = _rewardAmount;
  }

  /**
   * @notice Called by the owner to set the transaction details: address and data
   * @param _targetAddress The address of the contract to call by callFunction
   * @param _data The bytes data (excluding function signature) of the calldata
   */
  function setTransactionDetails(
    address _targetAddress,
    bytes memory _data
  )
    public
    onlyOwner()
  {
    transaction = Transaction({
      target: _targetAddress,
      data: _data
    });
  }

  /**
   * @notice Called by the owner to withdraw funds left on the contract
   * @param _recipient The address to receive funds
   * @param _amount The amount of funds to withdraw
   */
  function withdraw(
    address _recipient,
    uint256 _amount
  )
    public
    onlyOwner()
  {
    rewardToken.safeTransfer(_recipient, _amount);
  }
}
