import {
  BetCreated,
  BetFinalized,
  OwnershipTransferred
} from "../generated/Ubiroll/Ubiroll"
import { Bet } from "../generated/schema"

export function handleBetCreated(event: BetCreated): void {
  let betID = event.params.id.toString();

  let bet = Bet.load(betID);
	if (bet == null) {
		bet = new Bet(betID)
    bet.player = event.params.player;
    bet.chance = event.params.chance;
    bet.amount = event.params.amount;
    bet.requestId = event.params.requestId;
    
		bet.save()
	} 
}

export function handleBetFinalized(event: BetFinalized): void {
  let betID = event.params.id.toString();

  let bet = Bet.load(betID);
  bet.result = event.params.result;
  bet.win = event.params.win;
    
  bet.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}
