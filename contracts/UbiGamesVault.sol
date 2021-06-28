// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
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
    mapping(address => bool) public registeredGames;
    uint256 public burnPercentage;

    constructor(address _ubi, uint256 _burnPercentage) {
        ubi = _ubi;
        burnPercentage = _burnPercentage;
    }

    function gameDeposit(address _from, uint256 _amount)
        public
        onlyRegisteredGame
    {
        IERC20(ubi).transferFrom(_from, address(0), _amount);
        uint256 burnAmount = _amount.mul(burnPercentage).div(100);
        IERC20(ubi).transfer(address(0), burnAmount);
    }

    function gameWithdraw(address _to, uint256 _amount)
        public
        onlyRegisteredGame
    {
        IERC20(ubi).transfer(_to, _amount);
    }

    // WARNING: can empty vault when bet has not resolved yet
    function withdrawToken(address _token, uint256 _amount) public onlyOwner {
        IERC20(_token).transfer(msg.sender, _amount);
    }

    function setRegisteredGame(address _address, bool _value) public onlyOwner {
        registeredGames[_address] = _value;
    }

    function setUbi(address _ubi) public onlyOwner {
        ubi = _ubi;
    }

    function setBurnPercentage(uint256 _burnPercentage) public onlyOwner {
        burnPercentage = _burnPercentage;
    }

    function getUbiBalance() public view returns (uint256) {
        return IERC20(ubi).balanceOf(address(this));
    }
}
