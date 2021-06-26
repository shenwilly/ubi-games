// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface IUbiGamesOracle {
    function requestRandomNumber() external returns (bytes32 requestId);
}
