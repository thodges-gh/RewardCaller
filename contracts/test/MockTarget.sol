pragma solidity 0.6.12;

contract MockTarget {
  event Called();
  event CalledWithData(address addr);

  function targetFunction() external {
    emit Called();
  }

  function targetFunctionWithData(address _addr) external {
    emit CalledWithData(_addr);
  }

  function targetFunctionFails() external {
    assert(false);
  }

  function targetFunctionCallDeepTarget(address _target, bytes calldata _data) external {
    ( bool success, ) = _target.call(_data);
    emit Called();
  }
}
