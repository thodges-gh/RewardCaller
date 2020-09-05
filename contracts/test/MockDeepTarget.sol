pragma solidity 0.6.12;

contract MockDeepTarget {
  function targetFunctionFails() external {
    assert(false);
  }
}
