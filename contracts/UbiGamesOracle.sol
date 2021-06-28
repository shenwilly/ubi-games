// SPDX-License-Identifier: MIT
pragma solidity ^0.6.5;

import {VRFConsumerBase} from "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IUbiGame} from "./interfaces/IUbiGame.sol";

contract UbiGamesOracle is VRFConsumerBase, Ownable {
    bytes32 internal keyHash;
    uint256 public fee;

    modifier onlyRegistered() {
        require(registered[msg.sender], "Sender not registered");
        _;
    }

    mapping(address => bool) public registered;
    mapping(bytes32 => address) public requests;

    constructor(
        address _VRF,
        address _LINK,
        bytes32 _keyHash,
        uint256 _fee
    ) public VRFConsumerBase(_VRF, _LINK) {
        keyHash = _keyHash;
        fee = _fee;
    }

    function setRegistered(address _address, bool _value) public onlyOwner {
        registered[_address] = _value;
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

    function withdrawLINK() public onlyOwner {
        uint256 amount = LINK.balanceOf(address(this));
        LINK.transfer(msg.sender, amount);
    }
}
