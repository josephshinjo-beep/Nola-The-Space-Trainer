import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import { Modal } from '../../components/ConfirmDialog';
import type { SpaceWeather } from '../../data/useSpaceWeather';
import { SIM } from '../../simulation/config';
import { energyFlow, FAULT_INFO, isSunlit, machineStatus } from '../../simulation/engine';
import type { Action, ActionResult, FaultId, MachineId, StationState } from '../../simulation/types';
import { findEquipment, type EquipmentId } from '../stationMap';
import { RepairGame } from './MiniGames';

interface PanelProps {
  id: EquipmentId;
  state: StationState;
  dispatch: (action: Action) => ActionResult;
  weather: SpaceWeather;
  onClose: () => void;
  /** Today's urgent sol job, when it happens at this machine. */
  urgent?: { text: string; done: boolean; onDo: () => void } | null;
}

/** A labelled note that says whether something is real science or a game simplification. */
function Note({ kind, children }: { kind: 'real' | 'game'; children: ReactNode }) {
  return (
    <p className="rounded-2xl border-2 border-line bg-void/50 p-3 text-base">
      <span className={`mr-2 inline-block rounded-full px-3 py-0.5 text-sm font-bold text-void ${kind === 'real' ? 'bg-glow' : 'bg-nola-soft'}`}>
        {kind === 'real' ? 'Real science' : 'Game simplification'}
      </span>
      {children}
    </p>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 border-b-2 border-line py-2 text-lg">
      <dt className="text-mist">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

const hoursUntil = (state: StationState, minutes: number) => Math.max(0, (minutes - state.minutes) / 60);
const formatHours = (hours: number) => (hours < 1 ? `${Math.max(1, Math.round(hours * 60))} station minutes` : `${hours.toFixed(1)} station hours`);

/**
 * The pop-up for a machine: its readings, its controls and, when it is
 * broken, the repair mini-game. All of it is ordinary web content, so it
 * works with a keyboard and a screen reader.
 */
export function EquipmentPanel({ id, state, dispatch, weather, onClose, urgent }: PanelProps) {
  const item = findEquipment(id);
  const [message, setMessage] = useState<string | null>(null);
  const fault: FaultId | undefined = item.faults.find((candidate) => state.faults.includes(candidate));
  const running = machineStatus(state);

  // Some machines do their job just by being looked at.
  useEffect(() => {
    if (id === 'console') dispatch({ type: 'useConsole' });
    if (id === 'monitor') dispatch({ type: 'checkMonitor' });
  }, [id, dispatch]);

  const run = (action: Action) => setMessage(dispatch(action).message);

  function machineControls(machine: MachineId, working: boolean, offReason: string) {
    const on = state.machines[machine];
    return (
      <>
        <dl>
          <Reading label="Switch" value={on ? 'On' : 'Off'} />
          <Reading label="Status" value={working ? 'Running normally' : on ? offReason : 'Standing by'} />
        </dl>
        <Button onClick={() => run({ type: 'toggleMachine', machine })}>{on ? 'Switch off' : 'Switch on'}</Button>
      </>
    );
  }

  let body: ReactNode;
  if (fault) {
    body = (
      <>
        <p className="rounded-2xl border-2 border-alert bg-alert/10 p-3 text-lg font-semibold text-alert">
          <span aria-hidden="true">⚠ </span>
          {FAULT_INFO[fault].alert}
        </p>
        <RepairGame fault={fault} onWin={() => run({ type: 'repair', fault })} />
      </>
    );
  } else {
    switch (id) {
      case 'console':
        body = (
          <>
            <dl>
              <Reading label="Station day" value={`Day ${Math.floor(state.minutes / 1440) + 1}`} />
              <Reading label="Crew condition" value={`${Math.round(state.health)}%`} />
              <Reading label="Systems unlocked" value={`${state.unlocked.length} of 8`} />
              <Reading label="Problems to fix" value={state.faults.length === 0 ? 'None' : String(state.faults.length)} />
              <Reading label="Next cargo ship" value={`in about ${formatHours(hoursUntil(state, state.nextSupplyAt))}`} />
            </dl>
            <Note kind="game">Time is sped up: one station day passes in about 12 minutes, and the clock stops when you leave.</Note>
          </>
        );
        break;
      case 'generator':
        body = (
          <>
            {machineControls('oxygenGenerator', running.oxygenGenerator, running.powered ? 'Stopped: no water to split' : 'Stopped: no power')}
            <Note kind="real">The space station makes oxygen by electrolysis: electricity splits water into oxygen and hydrogen. So this machine uses both power and water.</Note>
          </>
        );
        break;
      case 'scrubber':
        body = (
          <>
            <dl>
              <Reading label="Filter" value="Clean" />
            </dl>
            <Note kind="real">Scrubbers trap the carbon dioxide the crew breathes out. Without them, the air becomes harmful.</Note>
          </>
        );
        break;
      case 'recycler':
        body = (
          <>
            {machineControls('waterRecycler', running.waterRecycler, 'Stopped: no power')}
            <Note kind="real">The real space station recovers about 98% of its water from urine, sweat and breath.</Note>
            <Note kind="game">In the game, the recycler wins back {Math.round(SIM.recyclerRecovery * 100)}% of the water the crew uses.</Note>
          </>
        );
        break;
      case 'pipes':
        body = (
          <dl>
            <Reading label="Pipes" value="No leaks" />
          </dl>
        );
        break;
      case 'growbed':
        body = (
          <>
            <dl>
              <Reading label="Crop" value={state.crop.stage === 'empty' ? 'Nothing planted' : state.crop.stage === 'ready' ? 'Ready to harvest!' : `Growing: ${Math.round(state.crop.progress * 100)}%`} />
              {state.crop.stage === 'growing' && <Reading label="Growing conditions" value={running.cropGrowing ? 'Good' : 'Paused: needs water and power'} />}
            </dl>
            {state.crop.stage === 'empty' && <Button onClick={() => run({ type: 'plant' })}>Plant a crop</Button>}
            {state.crop.stage === 'ready' && <Button onClick={() => run({ type: 'harvest' })}>Harvest</Button>}
            <Note kind="real">Hydroponics grows plants in nutrient-rich water with no soil. Astronauts have grown and eaten lettuce on the space station.</Note>
            <Note kind="game">Real lettuce takes about a month. Here, a crop takes {SIM.cropGrowHours} station hours.</Note>
          </>
        );
        break;
      case 'solar': {
        const flow = energyFlow(state);
        body = (
          <>
            <dl>
              <Reading label="Solar panels" value={state.panelsDeployed ? 'Deployed' : 'Folded away'} />
              <Reading label="Station is in" value={isSunlit(state.minutes) ? 'Sunlight' : "The planet's shadow"} />
              <Reading label="Power being made" value={`${flow.generation.toFixed(1)} units per hour`} />
            </dl>
            {!state.panelsDeployed && <Button onClick={() => run({ type: 'deployPanels' })}>Deploy solar panels</Button>}
            <Note kind="real">Solar panels only make power in sunlight. A station in low orbit spends about a third of each 90-minute orbit in shadow, running on batteries.</Note>
          </>
        );
        break;
      }
      case 'battery': {
        const flow = energyFlow(state);
        body = (
          <>
            <dl>
              <Reading label="Battery charge" value={`${Math.round(state.resources.energy)}%`} />
              <Reading label="Power coming in" value={`${flow.generation.toFixed(1)} units per hour`} />
              <Reading label="Power being used" value={`${flow.consumption.toFixed(1)} units per hour`} />
              <Reading label="Battery is" value={flow.generation >= flow.consumption ? 'Charging' : 'Draining'} />
              <Reading label="Power saver" value={state.powerSaver ? 'On' : 'Off'} />
            </dl>
            <Button onClick={() => run({ type: 'togglePowerSaver' })}>{state.powerSaver ? 'Turn power saver off' : 'Turn power saver on'}</Button>
            <Note kind="game">Switching machines off in their rooms also saves power. Decide what the crew needs most!</Note>
          </>
        );
        break;
      }
      case 'antenna': {
        const wait = hoursUntil(state, state.supplyRequestReadyAt);
        body = (
          <>
            <dl>
              <Reading label="Link to Earth" value="Connected" />
              <Reading label="Next cargo ship" value={`in about ${formatHours(hoursUntil(state, state.nextSupplyAt))}`} />
            </dl>
            <Button disabled={wait > 0} onClick={() => run({ type: 'requestSupply' })}>
              {wait > 0 ? `Next request possible in ${formatHours(wait)}` : 'Request a supply delivery'}
            </Button>
            <Note kind="real">Radio signals travel at the speed of light. They reach the Moon in about 1.3 seconds, but take 3 to 22 minutes to reach Mars.</Note>
          </>
        );
        break;
      }
      case 'medstation': {
        const wait = hoursUntil(state, state.healReadyAt);
        body = (
          <>
            <dl>
              <Reading label="Crew condition" value={`${Math.round(state.health)}%`} />
            </dl>
            <Button disabled={wait > 0} onClick={() => run({ type: 'heal' })}>
              {wait > 0 ? `Ready again in ${formatHours(wait)}` : 'Have a check-up'}
            </Button>
            <Note kind="game">The crew stays healthy when air, water, food and temperature are all in the safe range.</Note>
          </>
        );
        break;
      }
      case 'thermostat':
        body = (
          <>
            <dl>
              <Reading label="Cabin temperature" value={`${state.temperature.toFixed(1)} °C`} />
              <Reading label="Comfortable range" value={`${SIM.tooCold} to ${SIM.tooHot} °C`} />
            </dl>
            {machineControls('thermalControl', running.thermalControl, 'Stopped: no power')}
            <Note kind="real">With no air outside to carry heat, a spacecraft heats up in sunlight and cools in shadow. Heaters and radiators keep it steady.</Note>
          </>
        );
        break;
      case 'monitor':
        body = (
          <>
            <dl>
              <Reading label="Radiation here" value={state.radiation > SIM.radiationHarmLevel ? 'HIGH' : state.storm ? 'Safe (shielded)' : 'Normal'} />
              <Reading label="Solar storm" value={state.storm ? `In progress, about ${formatHours(hoursUntil(state, state.storm.endsAt))} left` : 'None'} />
              {weather.summary && <Reading label="Space weather" value={weather.summary.headline} />}
              {weather.data && (
                <>
                  <Reading label="Strongest recent flare" value={weather.data.strongestFlareClass ?? 'None'} />
                  <Reading label="Highest Kp index" value={weather.data.maxKpIndex === null ? 'No storm recorded' : String(weather.data.maxKpIndex)} />
                  <Reading label="Data source" value={weather.data.source.name} />
                  <Reading label="Data fetched" value={new Date(weather.data.fetchedAt).toLocaleString()} />
                </>
              )}
            </dl>
            {weather.data?.source.isSimulated && <Note kind="game">The space weather shown here is simulated for now. It is not a real NASA measurement.</Note>}
            <Note kind="real">Astronauts shelter in the best-shielded part of the spacecraft during solar storms.</Note>
            <Note kind="game">You are safe from storms whenever you stand in this room. Radiation "level" is a game number, not a real unit.</Note>
          </>
        );
        break;
    }
  }

  return (
    <Modal open title={item.name} onClose={onClose} wide>
      <div className="space-y-4">
        {urgent && (
          <section aria-label="Urgent job" className={`rounded-2xl border-2 p-4 ${urgent.done ? 'border-go bg-go/10' : 'border-nola bg-nola/10'}`}>
            <p className="font-display text-lg font-semibold">{urgent.done ? 'Urgent job done!' : 'Urgent job'}</p>
            <p className="text-lg">{urgent.text}</p>
            {urgent.done ? (
              <p className="mt-2 text-base text-mist">Go back to the Command Console to end the sol.</p>
            ) : (
              <Button className="mt-3" onClick={urgent.onDo}>
                Do the urgent job
              </Button>
            )}
          </section>
        )}
        {body}
        <p role="status" className="min-h-7 text-lg font-semibold text-glow">
          {message}
        </p>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
