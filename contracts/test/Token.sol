pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
  constructor(
    string memory name,
    string memory symbol
  )
    public
    ERC20(name, symbol)
  {
    _mint(msg.sender, 10000);
  }
}
