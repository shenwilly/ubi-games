import { BigInt } from "@graphprotocol/graph-ts"
import {
  Ubiroll,
  BetCreated,
  BetFinalized,
  OwnershipTransferred
} from "../generated/Ubiroll/Ubiroll"
import { Bet } from "../generated/schema"

export function handleBetCreated(event: BetCreated): void {
  let betID = event.params.id;

	let contract = Ubiroll.bind(event.address);
	// return contract.disputes(disputeID)
  
}

export function handleBetFinalized(event: BetFinalized): void {
  
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}
