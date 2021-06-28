// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface IUbiGamesVault {
    function gameDeposit(address _from, uint256 _amount) external;

    function gameWithdraw(address _to, uint256 _amount) external;

    function getUbiBalance() external view returns (uint256);
}
