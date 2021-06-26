// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface IUbiGame {
    function finalizeBet(bytes32 _requestId, uint256 _randomness) external;
}
