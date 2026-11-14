import { Map as MapIcon, Menu } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Button, buttonClasses } from '../components/Button';
import { ConfirmDialog, Modal } from '../components/ConfirmDialog';
import { pauseSpaceBackdrop } from '../components/space/SpaceBackdrop';
import { nextStormEvent, useSpaceEvents } from '../data/spaceEvents';
import { useSpaceWeather } from '../data/useSpaceWeather';
import { useAcademyProgress } from '../features/academy/AcademyProgressContext';
import { CURRICULUM } from '../features/academy/curriculum';
import { useSettings } from '../features/accessibility/SettingsContext';
import { useAuth } from '../features/auth/AuthContext';
import { NolaMascot } from '../features/companion/NolaMascot';
import { SpeechBubble } from '../features/companion/SpeechBubble';
import { DEFAULT_AVATAR } from '../features/profile/avatarOptions';
import { GameBridge, type GameView } from '../game/GameBridge';
import { EquipmentPanel } from '../game/hud/EquipmentPanel';
import { InteractButton, Joystick, MissionPanel, NolaCaption, ResourceStrip } from '../game/hud/Hud';
import { StationMapModal } from '../game/hud/StationMapModal';
import { EQUIPMENT, findEquipment, findRoom, ROOMS, type EquipmentId } from '../game/stationMap';
import { SolBriefing, solHint } from '../game/sol/SolBriefing';
import { RadiationStormBanner, stormResultText } from '../game/sol/RadiationStormBanner';
import { stormIsDue, urgentJob, type SolSave } from '../game/sol/solFlow';
import { useSolMission } from '../game/sol/useSolMission';
import { useSimulation } from '../game/useSimulation';
import { SIM } from '../simulation/config';
import { DEFAULT_INPUTS, machineStatus } from '../simulation/engine';
import { SOL_CONFIG } from '../sol/config';
import { currentMission } from '../simulation/missions';
import type { RoomId, StationState } from '../simulation/types';

const SOL_LENGTH = SOL_CONFIG.time.missionLengthSols.value;
const STORM = SOL_CONFIG.storm;

// Phaser is large, so it is downloaded only when the game is opened.
const PhaserGame = lazy(() => import('../game/PhaserGame'));

/** Which machine the next mission task happens at. */
function missionTarget(state: StationState): EquipmentId | null {
  const mission = currentMission(state);
  const task = mission?.tasks.find((candidate) => !state.completedTasks.includes(candidate.id));
  if (!task) return null;
  if (task.id === 'visit:medical') return 'medstation';
  if (task.id === 'shelter') return 'monitor';
  return EQUIPMENT.find((item) => item.tasks.includes(task.id))?.id ?? null;
}

/** Where today's sol says to go: the console to plan or finish, or the urgent job's machine. */
function solTarget(save: SolSave | null): EquipmentId | null {
  if (!save || save.state.status !== 'active') return null;
  if (save.state.phase === 'decision') return 'console';
  const job = urgentJob(save);
  return job && !job.done ? job.card.urgent.equipment : 'console';
}

function buildView(state: StationState, avatar: GameView['avatar'], reducedMotion: boolean, urgent: EquipmentId | null): GameView {
  const running = machineStatus(state);
  const on: EquipmentId[] = [];
  if (running.oxygenGenerator) on.push('generator');
  if (running.waterRecycler) on.push('recycler');
  if (running.thermalControl) on.push('thermostat');
  if (running.cropGrowing) on.push('growbed');
  if (state.panelsDeployed) on.push('solar');
  return {
    lockedRooms: ROOMS.filter((room) => !state.unlocked.includes(room.system)).map((room) => room.id),
    alerts: EQUIPMENT.filter((item) => item.faults.some((fault) => state.faults.includes(fault))).map((item) => item.id),
    target: missionTarget(state),
    urgent,
    running: on,
    cropStage: state.crop.stage,
    storm: state.storm !== null,
    avatar,
    reducedMotion,
  };
}

function StationGame() {
  const { user, profile } = useAuth();
  const { unlockedSystems } = useAcademyProgress();
  const { settings } = useSettings();
  const weather = useSpaceWeather();
  const bridge = useMemo(() => new GameBridge(), []);

  const [room, setRoom] = useState<RoomId | null>(null);
  const [nearby, setNearby] = useState<EquipmentId | null>(null);
  const [openEquipment, setOpenEquipment] = useState<EquipmentId | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const roomRef = useRef<RoomId | null>(null);
  const weatherInputs = weather.summary?.inputs ?? DEFAULT_INPUTS.spaceWeather;
  const sim = useSimulation(user?.uid, unlockedSystems, () => ({ inShelter: roomRef.current === 'shelter', spaceWeather: weatherInputs }));
  const { state, dispatch, setPaused } = sim;
  const solMission = useSolMission(user?.uid);
  const solSave = solMission.save;
  const spaceEvents = useSpaceEvents();
  const [stormMessage, setStormMessage] = useState<string | null>(null);

  // The game fills the screen, so the star background behind it can rest.
  useEffect(() => pauseSpaceBackdrop(), []);

  // What the player does in the game world.
  useEffect(() => {
    const stop = [
      bridge.on('room', (next) => {
        roomRef.current = next;
        setRoom(next);
        dispatch({ type: 'visit', room: next });
      }),
      bridge.on('nearby', setNearby),
      bridge.on('interact', setOpenEquipment),
    ];
    return () => stop.forEach((off) => off());
  }, [bridge, dispatch]);

  // The clock and the astronaut both stop while a panel or menu is open.
  const paused = openEquipment !== null || mapOpen || menuOpen || confirmRestart || state?.status === 'failed';
  useEffect(() => {
    bridge.paused = paused;
    setPaused(paused);
  }, [bridge, paused, setPaused]);

  // Tell the game what to draw, but only when something visible changed.
  const avatar = profile?.avatar ?? DEFAULT_AVATAR;
  const view = state ? buildView(state, avatar, settings.reduceMotion, solTarget(solSave)) : null;
  const viewKey = view ? JSON.stringify(view) : '';
  useEffect(() => {
    if (viewKey) bridge.setView(JSON.parse(viewKey) as GameView);
  }, [bridge, viewKey]);

  const closePanel = useCallback(() => setOpenEquipment(null), []);

  // Radiation storms from real NASA solar events: a warning every few sols
  // during the day, once the Radiation Protection module is passed.
  const stationMinutes = state?.minutes ?? null;
  const radiationUnlocked = unlockedSystems.includes('radiation');
  const { announceStorm, stormHits } = solMission;
  useEffect(() => {
    if (!solSave || stationMinutes === null || !spaceEvents || !radiationUnlocked) return;
    if (!stormIsDue(solSave, STORM.everySols.value)) return;
    const pick = nextStormEvent(spaceEvents, solSave.state.stormEventsUsed);
    if (!pick) return;
    setStormMessage(null);
    announceStorm({ event: pick.event, severity: pick.event.severity, live: pick.live, arrivesAtStationMinute: stationMinutes + STORM.warningStationMinutes.value });
  }, [solSave, stationMinutes, spaceEvents, radiationUnlocked, announceStorm]);

  // The countdown runs on the station clock, so it stops when the game is paused.
  const storm = solSave?.state.storm ?? null;
  const stormMinutesLeft = storm && stationMinutes !== null ? Math.min(storm.arrivesAtStationMinute - stationMinutes, STORM.warningStationMinutes.value) : null;
  useEffect(() => {
    if (stormMinutesLeft === null || stormMinutesLeft > 0) return;
    const hit = stormHits();
    if (hit) setStormMessage(stormResultText(hit));
  }, [stormMinutesLeft, stormHits]);

  // Opening the Command Console still counts for the "Find your feet" mission.
  useEffect(() => {
    if (openEquipment === 'console') dispatch({ type: 'useConsole' });
  }, [openEquipment, dispatch]);

  // Today's urgent job, if it happens at the machine that is open.
  const job = solSave ? urgentJob(solSave) : null;
  const urgentHere =
    job && openEquipment === job.card.urgent.equipment && solSave?.state.phase === 'action'
      ? { text: job.card.urgent.text, done: job.done, onDo: () => solMission.completeJob(job.taskId) }
      : null;

  if (sim.loadError) {
    return (
      <div className="p-6">
        <p role="alert" className="rounded-2xl border-2 border-alert bg-alert/10 p-4 text-lg font-semibold text-alert">
          We couldn't load your station. Check your connection and refresh the page.
        </p>
      </div>
    );
  }
  if (!state) {
    return (
      <p role="status" className="p-6 text-xl text-mist">
        Powering up your station…
      </p>
    );
  }

  const nearbyName = nearby ? findEquipment(nearby).name : null;
  const lowest = (['oxygen', 'water', 'food'] as const).filter((id) => state.unlocked.includes(id)).sort((a, b) => state.resources[a] - state.resources[b])[0];

  return (
    <div className="relative h-full overflow-hidden bg-void">
      <Suspense
        fallback={
          <p role="status" className="p-6 text-xl text-mist">
            Loading the station…
          </p>
        }
      >
        <PhaserGame bridge={bridge} />
      </Suspense>

      {/* Everything below floats over the game. Only the controls catch clicks. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col gap-2 p-2 sm:p-3">
        <h1 className="sr-only">NOLA Mission: your space station</h1>
        <ResourceStrip state={state} />

        <div className="flex flex-wrap items-start justify-between gap-2 xl:flex-nowrap">
          <div className="flex flex-col gap-2">
            {solSave && (
              <section aria-label="Today's plan" className="pointer-events-auto w-64 max-w-[70vw] rounded-2xl border-2 border-nola bg-hull/90 p-3 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-widest text-nola-soft">
                  Sol {solSave.state.sol} of {SOL_LENGTH}
                </p>
                <p aria-live="polite" className="text-sm font-semibold">
                  {solHint(solSave)}
                </p>
              </section>
            )}
            <MissionPanel state={state} />
          </div>
          {/* The storm warning: its own row at the top on smaller screens, in the middle on wide ones. */}
          <div className="order-first flex w-full min-w-0 justify-center empty:hidden xl:order-none xl:w-auto xl:flex-1">
            {solSave && storm && stormMinutesLeft !== null ? (
              <RadiationStormBanner
                state={solSave.state}
                storm={storm}
                stationMinutesLeft={stormMinutesLeft}
                minutesPerRealSecond={SIM.minutesPerRealSecond}
                onChoose={(choice) => {
                  solMission.answerStorm(choice);
                }}
              />
            ) : (
              stormMessage && (
                <p role="status" className="pointer-events-auto flex max-w-sm items-start gap-2 rounded-2xl border-2 border-nola bg-hull/95 p-3 text-sm font-semibold">
                  <span className="flex-1">{stormMessage}</span>
                  <button type="button" onClick={() => setStormMessage(null)} className="font-bold text-nola-soft underline">
                    OK
                  </button>
                </p>
              )
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => setMapOpen(true)} className="pointer-events-auto flex h-12 items-center gap-2 rounded-full border-2 border-line bg-hull/90 px-4 font-bold">
              <MapIcon aria-hidden="true" size={20} /> Map
            </button>
            <button type="button" onClick={() => setMenuOpen(true)} className="pointer-events-auto flex h-12 items-center gap-2 rounded-full border-2 border-line bg-hull/90 px-4 font-bold">
              <Menu aria-hidden="true" size={20} /> Menu
            </button>
          </div>
        </div>

        <div className="flex-1" />

        <p className="pointer-events-auto w-fit rounded-full bg-hull/90 px-3 py-1 text-sm font-bold" aria-live="polite">
          {room ? findRoom(room).name : 'Station'}
          {nearbyName ? ` · Near: ${nearbyName}` : ''}
        </p>
        <div className="flex justify-center sm:hidden">
          <NolaCaption state={state} />
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="[@media(pointer:fine)]:hidden">
            <Joystick bridge={bridge} />
          </div>
          <div className="hidden text-sm font-bold text-mist [@media(pointer:fine)]:block">
            <p className="pointer-events-auto rounded-xl bg-hull/90 px-3 py-2">Move: WASD or arrow keys · Use: E</p>
          </div>
          <div className="hidden min-w-0 flex-1 justify-center sm:flex">
            <NolaCaption state={state} />
          </div>
          <InteractButton label={nearbyName} onPress={() => nearby && setOpenEquipment(nearby)} />
        </div>

        {sim.saveError && (
          <p role="alert" className="pointer-events-auto rounded-xl border-2 border-alert bg-hull px-3 py-1 text-sm font-semibold text-alert">
            Saving is not working right now. Your progress will be saved when the connection returns.
          </p>
        )}
      </div>

      {openEquipment === 'console' && solSave ? (
        <SolBriefing save={solSave} unlocked={unlockedSystems} onPlan={solMission.plan} onSkip={solMission.skip} onFinish={solMission.finish} onClose={closePanel} />
      ) : (
        openEquipment && <EquipmentPanel id={openEquipment} state={state} dispatch={dispatch} weather={weather} onClose={closePanel} urgent={urgentHere} />
      )}

      <StationMapModal
        open={mapOpen}
        state={state}
        currentRoom={room}
        onClose={() => setMapOpen(false)}
        onTravel={(id) => {
          bridge.travelTo = id;
          setMapOpen(false);
        }}
      />

      <Modal open={menuOpen} title="Game paused" onClose={() => setMenuOpen(false)}>
        <p className="mb-5 text-lg text-mist">Your station is saved automatically. Time stands still while you are away.</p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => setMenuOpen(false)}>Back to the station</Button>
          <Link to="/profile" className={buttonClasses('secondary')}>
            Accessibility settings
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              setMenuOpen(false);
              setConfirmRestart(true);
            }}
          >
            Restart the station
          </Button>
          <Link to="/" className={buttonClasses('secondary')} onClick={sim.saveNow}>
            Save and exit to Mission Control
          </Link>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmRestart}
        title="Restart your station?"
        message="Your station will go back to day one and your missions will start again. Your Academy lessons stay completed."
        confirmLabel="Restart station"
        onConfirm={() => {
          setConfirmRestart(false);
          void sim.restart();
          void solMission.restart();
        }}
        onCancel={() => setConfirmRestart(false)}
      />

      <Modal open={state.status === 'failed'} title="Emergency recovery" onClose={sim.recoverStation}>
        <div className="flex flex-col items-center gap-4 text-center">
          <NolaMascot mood="curious" size={120} />
          <p className="text-lg">
            The crew became too unwell to carry on, so I stepped in and stabilised the station.
            {lowest && state.resources[lowest] < 25 ? ` It looks like ${lowest} ran too low.` : ''} Every astronaut has tough days. That is how they learn!
          </p>
          <p className="text-mist">Your missions and progress are safe.</p>
          <Button onClick={sim.recoverStation}>Try again</Button>
        </div>
      </Modal>
    </div>
  );
}

/** The Mission page: the station game, or a friendly locked screen before Module 1 is passed. */
export default function MissionPage() {
  const { loaded, unlockedSystems } = useAcademyProgress();
  const first = CURRICULUM[0];

  if (!loaded) {
    return (
      <p role="status" className="p-6 text-xl text-mist">
        Checking your training record…
      </p>
    );
  }

  if (!unlockedSystems.includes('station-access')) {
    const message = `The station airlock is still sealed! Pass Module 1, ${first?.title}, and I'll open it for you.`;
    return (
      <div className="mx-auto max-w-3xl space-y-8 p-4 sm:p-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">NOLA Mission</h1>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <NolaMascot mood="curious" size={150} className="shrink-0" />
          <SpeechBubble className="flex-1" readAloudText={message}>
            {message}
          </SpeechBubble>
        </div>
        {first && (
          <Link to={`/academy/${first.id}`} className={buttonClasses('primary')}>
            Go to Module 1
          </Link>
        )}
      </div>
    );
  }

  return <StationGame />;
}
