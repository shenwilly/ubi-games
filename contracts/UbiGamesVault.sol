// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract UbiGamesVault is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    modifier onlyRegisteredGame() {
        require(registeredGames[msg.sender], "Game not registered");
        _;
    }

    address public ubi;
    address public burner;
    mapping(address => bool) public registeredGames;
    uint256 public burnPercentage;
    uint256 public pendingBurn;

    event Burn(uint256 amount);

    constructor(address _ubi, address _burner, uint256 _burnPercentage) {
        ubi = _ubi;
        burner = _burner;
        burnPercentage = _burnPercentage;
    }

    function gameDeposit(address _from, uint256 _amount)
        public
        onlyRegisteredGame
    {
        IERC20(ubi).transferFrom(_from, address(this), _amount);
        uint256 burnAmount = _amount.mul(burnPercentage).div(100);
        pendingBurn = pendingBurn.add(burnAmount);
    }

    function gameWithdraw(address _to, uint256 _amount)
        public
        onlyRegisteredGame
    {
        IERC20(ubi).transfer(_to, _amount);
    }

    function withdrawUbiToBurn() public {
        require(pendingBurn > 0, "Nothing to burn");

        IERC20(ubi).transfer(burner, pendingBurn);
        pendingBurn = 0;

        emit Burn(pendingBurn);
    }

    // WARNING: can empty vault when games have not not resolved
    function withdrawUbi(uint256 _amount) public onlyOwner {
        uint256 withdrawable = IERC20(ubi).balanceOf(address(this)).sub(
            pendingBurn
        );
        require(_amount <= withdrawable, "Amount too large");

        IERC20(ubi).transfer(msg.sender, _amount);
    }

    function setRegisteredGame(address _address, bool _value) public onlyOwner {
        registeredGames[_address] = _value;
    }

    function setUbi(address _ubi) public onlyOwner {
        ubi = _ubi;
    }

    function setBurner(address _burner) public onlyOwner {
        burner = _burner;
    }

    function setBurnPercentage(uint256 _burnPercentage) public onlyOwner {
        burnPercentage = _burnPercentage;
    }

    function getUbiBalance() public view returns (uint256) {
        return IERC20(ubi).balanceOf(address(this));
    }
}
