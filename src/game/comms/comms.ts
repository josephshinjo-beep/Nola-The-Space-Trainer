import { SIM } from '../../simulation/config';
import { earthWaitMinutes, MISTAKE_RESOURCE } from '../../simulation/engine';
import type { EarthCall, FaultId, ResourceId, StationState } from '../../simulation/types';

/**
 * Where a message to Mission Control is, in REAL delay time (the number the
 * player sees) and in game time (how long they actually wait).
 */
export interface CallProgress {
  /** Real round-trip delay, in seconds. Never scaled. */
  realRoundTripSeconds: number;
  /** Real delay still to go, in seconds, for the countdown clock. */
  realSecondsLeft: number;
  /** How much faster than real life the wait plays (1 = real time). */
  speedUp: number;
  /** Real seconds of play until the reply arrives. */
  playSecondsLeft: number;
  /** 0 when sent, 1 when the reply arrives. */
  share: number;
}

export function callProgress(call: Pick<EarthCall, 'oneWaySeconds' | 'sentAt' | 'repliesAt'>, minutes: number): CallProgress {
  const realRoundTripSeconds = 2 * call.oneWaySeconds;
  const waitMinutes = Math.max(call.repliesAt - call.sentAt, 1e-9);
  const minutesLeft = Math.min(Math.max(call.repliesAt - minutes, 0), waitMinutes);
  const playSeconds = waitMinutes / SIM.minutesPerRealSecond;
  return {
    realRoundTripSeconds,
    realSecondsLeft: realRoundTripSeconds * (minutesLeft / waitMinutes),
    speedUp: realRoundTripSeconds / playSeconds,
    playSecondsLeft: minutesLeft / SIM.minutesPerRealSecond,
    share: 1 - minutesLeft / waitMinutes,
  };
}

/** The same numbers before sending, for the "Ask Mission Control" choice. */
export function planCall(oneWaySeconds: number): CallProgress {
  return callProgress({ oneWaySeconds, sentAt: 0, repliesAt: earthWaitMinutes(oneWaySeconds) }, 0);
}

/** How much of the problem's store has been lost since the message was sent (% of a tank). */
export function lostWhileWaiting(call: EarthCall, state: StationState): { resource: ResourceId; lost: number } {
  const resource = MISTAKE_RESOURCE[call.fault];
  return { resource, lost: Math.max(0, call.resourcesAtSend[resource] - state.resources[resource]) };
}

export const findCall = (state: StationState, fault: FaultId) => state.earthCalls.find((call) => call.fault === fault) ?? null;

/** "120× faster than real life" or "in real time". */
export const speedText = (speedUp: number) => (speedUp <= 1.01 ? 'in real time' : `${Math.round(speedUp)}× faster than real life`);
