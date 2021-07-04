import {
  Ubiroll,
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
    bet.timestamp = event.block.timestamp;
    bet.txHash = event.transaction.hash;

    let ubiroll = Ubiroll.bind(event.address);
    let betObj = ubiroll.bets(event.params.id);
    bet.prize = betObj.value5;
    bet.finished = false;

		bet.save()
	} 
}

export function handleBetFinalized(event: BetFinalized): void {
  let betID = event.params.id.toString();

  let bet = Bet.load(betID);
  bet.result = event.params.result;
  bet.win = event.params.win;
  bet.finished = true;
    
  bet.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}
