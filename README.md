# UBI Games

Collection of [UBI](https://github.com/DemocracyEarth/ubi) powered smart contracts and games:

- `Ubiroll.sol` is a dice roll game where players can choose their winning chance and potential payout.
- `UbiGamesVault.sol` stores house balance. A portion of revenue will be reserved for burning, reducing the total supply of UBI.
- `UbiGamesOracle.sol` provides randomness for games. Requires [LINK](https://github.com/smartcontractkit/LinkToken) token to work.

## High Level Overview

![Overview](https://gateway.pinata.cloud/ipfs/QmZ4gdJkYMELrS8otm6XaBiCxY9pHbHQNrbaq8Q4qVeExU)


## Available Functionality

### Install

`yarn`

### Build Contracts and Generate Typechain Typeings

`yarn build`

### Run Contract Tests

`yarn test`

## Deployed Contracts (Polygon)

- Ubiroll: 0xAEd5da67b8aD39Aa03374c2b8Ff8e049b722629F
- UbiGamesVault: 0xa6fB8238480adB35882A51fE00d5dE9eC56B882d
- UbiGamesOracle: 0x9eb9185d05b9941bd835e6ed78ed015519566557
