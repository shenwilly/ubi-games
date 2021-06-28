// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IUbiGame} from "./interfaces/IUbiGame.sol";
import {IUbiGamesOracle} from "./interfaces/IUbiGamesOracle.sol";

contract Ubiroll is IUbiGame, Ownable {
    using SafeERC20 for IERC20;

    struct Bet {
        uint256 id;
        address player;
        uint256 chance;
        uint256 result;
        uint256 betAmount;
        uint256 prizeAmount;
        bool finished;
        bytes32 oracleRequestId;
    }

    address ubi;
    address oracle;

    Bet[] bets;
    mapping(bytes32 => uint256) oracleRequestToBet;
    bool public gamePaused = false;
    uint16 public houseEdge = 1; // 1/100

    modifier notPaused() {
        require(!gamePaused, "Game is paused");
        _;
    }

    event BetCreated(
        uint256 indexed id,
        address indexed player,
        uint256 chance,
        uint256 amount
    );
    event BetFinalized(
        uint256 indexed id,
        address indexed player,
        uint256 chance,
        uint256 result,
        bool win
    );

    constructor(address _ubi, address _oracle) {
        ubi = _ubi;
        oracle = _oracle;
    }

    function createBet(uint256 _chance, uint256 _amount) public notPaused {
        require(_amount > 0, "bet amount must be greater than 0");
        require(_chance > 0, "winning chance must be greater than 0");
        require((_chance + houseEdge) < 100, "winning chance must be lower");

        uint256 prize = calculatePrize(_chance, _amount);
        require(prize < maxPrize(), "prize must be lower than maxPrize");

        IERC20(ubi).transferFrom(msg.sender, address(this), _amount);

        uint256 betIndex = bets.length;
        Bet memory bet;
        bet.id = betIndex;
        bet.player = msg.sender;
        bet.chance = _chance;
        bet.betAmount = _amount;
        bet.prizeAmount = prize;

        bytes32 requestId = IUbiGamesOracle(oracle).requestRandomNumber();
        bet.oracleRequestId = requestId;
        bets.push(bet);

        oracleRequestToBet[requestId] = betIndex;

        emit BetCreated(betIndex, msg.sender, _chance, _amount);
    }

    function finalizeBet(bytes32 _requestId, uint256 _randomness)
        public
        override
    {
        uint256 result = (_randomness % 100) + 1;

        uint256 betId = oracleRequestToBet[_requestId];
        Bet storage bet = bets[betId];
        bet.result = result;

        if (bet.chance >= result) {
            IERC20(ubi).transfer(bet.player, bet.prizeAmount);
            emit BetFinalized(bet.id, bet.player, bet.chance, result, true);
        } else {
            emit BetFinalized(bet.id, bet.player, bet.chance, result, false);
        }

        bet.finished = true;
    }

    function maxPrize() public view returns (uint256) {
        uint256 balance = IERC20(ubi).balanceOf(address(this));
        return balance / 100;
    }

    function calculatePrize(uint256 _winningChance, uint256 _amount)
        public
        view
        returns (uint256)
    {
        return (100 / _winningChance) * _amount * ((100 - houseEdge) / 100);
    }

    function setHouseEdge(uint16 _houseEdge) public onlyOwner {
        houseEdge = _houseEdge;
    }
}
