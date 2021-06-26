// SPDX-License-Identifier: MIT
pragma solidity ^0.6.5;

import {VRFConsumerBase} from "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";
import {Ownable} from "@openzeppelin/contracts-6-7/access/Ownable.sol";
import {IUbiGame} from "./interfaces/IUbiGame.sol";

contract UbiGamesOracle is VRFConsumerBase, Ownable {
    bytes32 internal keyHash;
    uint256 internal fee;

    modifier onlyRegistered() {
        _;
    }

    mapping(address => bool) registeredContracts;
    mapping(bytes32 => address) requests;

    constructor()
        public
        VRFConsumerBase(
            0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9, // VRF Coordinator
            0xa36085F69e2889c224210F603D836748e7dC0088 // LINK Token
        )
    {
        keyHash = 0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f3;
        fee = 0.1 * 10**18; // 0.1 LINK (Varies by network)
    }

    function setRegisteredContract(address _address, bool _value)
        public
        onlyOwner
    {
        registeredContracts[_address] = _value;
    }

    function requestRandomNumber()
        public
        onlyRegistered
        returns (bytes32 requestId)
    {
        require(
            LINK.balanceOf(address(this)) >= fee,
            "Not enough LINK - fill contract with faucet"
        );
        requestId = requestRandomness(keyHash, fee);
        requests[requestId] = msg.sender;
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomness)
        internal
        override
    {
        IUbiGame(requests[requestId]).finalizeBet(requestId, randomness);
    }
}
