import { useImmersive } from '../app/immersive';
import { Box, Volume2, VolumeX } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Button, buttonClasses } from '../components/Button';
import { ConfirmDialog, Modal } from '../components/ConfirmDialog';
import { pauseSpaceBackdrop } from '../components/space/SpaceBackdrop';
import { pickFinding, useAstronautScience } from '../data/astronautScience';
import { nextStormEvent, useSpaceEvents } from '../data/spaceEvents';
import { AstronautScienceCard } from '../features/science/AstronautScienceCard';
import { stormHarm } from '../sol/engine';
import { useSpaceWeather } from '../data/useSpaceWeather';
import { useAcademyProgress } from '../features/academy/AcademyProgressContext';
import { CURRICULUM } from '../features/academy/curriculum';
import { useSettings } from '../features/accessibility/SettingsContext';
import { useAuth } from '../features/auth/AuthContext';
import { NolaMascot } from '../features/companion/NolaMascot';
import { SpeechBubble } from '../features/companion/SpeechBubble';
import { DEFAULT_AVATAR } from '../features/profile/avatarOptions';
import { GameBridge, type GameView } from '../game/GameBridge';
import { EarthLinkPanel } from '../game/comms/EarthComms';
import { EquipmentPanel } from '../game/hud/EquipmentPanel';
import { InteractButton, Joystick, MissionPanel, NolaCaption } from '../game/hud/Hud';
import { Hotbar, StatusBar } from '../game/hud/HudBar';
import { StationMapModal } from '../game/hud/StationMapModal';
import { EQUIPMENT, findEquipment, findRoom, ROOMS, type EquipmentId } from '../game/stationMap';
import { BodyStatus } from '../game/sol/BodyStatus';
import { SolBriefing, solHint } from '../game/sol/SolBriefing';
import { RadiationStormBanner, stormResultText } from '../game/sol/RadiationStormBanner';
import { stormIsDue, urgentJob, type SolSave } from '../game/sol/solFlow';
import { useSolMission } from '../game/sol/useSolMission';
import { TutorialCoach } from '../game/sol/TutorialCoach';
import { tutorialStep } from '../game/sol/tutorial';
import { useMissionRecord } from '../game/progress/useMissionRecord';
import { useSimulation } from '../game/useSimulation';
import { SIM } from '../simulation/config';
import { DEFAULT_INPUTS, getStationStats, machineStatus } from '../simulation/engine';
import { SOL_CONFIG } from '../sol/config';
import { currentMission } from '../simulation/missions';
import type { RoomId, StationState } from '../simulation/types';
import type { Quality } from '../game3d/Station3D';
import { audio } from '../features/audio/audioEngine';

const SOL_LENGTH = SOL_CONFIG.time.missionLengthSols.value;
const STORM = SOL_CONFIG.storm;

// Phaser is large, so it is downloaded only when the game is opened.
const PhaserGame = lazy(() => import('../game/PhaserGame'));
// The 3D view of the same game (three.js), downloaded only when it is opened.
const Station3DView = lazy(() => import('../game3d/Station3DView'));

export type ViewMode = '2d' | '3d';
const QUALITY_KEY = 'nola.mission3d.quality';

function savedQuality(): Quality {
  try {
    return localStorage.getItem(QUALITY_KEY) === 'low' ? 'low' : 'high';
  } catch {
    return 'high';
  }
}

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

function StationGame({ mode }: { mode: ViewMode }) {
  useImmersive();
  const { user, profile } = useAuth();
  const { unlockedSystems, completedModuleIds } = useAcademyProgress();
  const { settings, update } = useSettings();
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
  const stationStats = useMemo(() => (state ? getStationStats(state) : null), [state]);
  // Re-work badges only when something they depend on changes, not every clock tick.
  const statsKey = stationStats ? `${stationStats.askedEarthFixes}-${stationStats.trainingFixes}` : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableStats = useMemo(() => stationStats, [statsKey]);
  const missionRecord = useMissionRecord(user?.uid, solSave, stableStats, completedModuleIds);
  const [quality, setQuality] = useState<Quality>(savedQuality);
  const [fps, setFps] = useState<number | null>(null);
  const changeQuality = (next: Quality) => {
    setQuality(next);
    try {
      localStorage.setItem(QUALITY_KEY, next);
    } catch {
      // Private browsing can block storage; the choice still applies now.
    }
  };
  const [stormMessage, setStormMessage] = useState<{ text: string; harmed: boolean; turn: number } | null>(null);
  const science = useAstronautScience();
  const [commsMessage, setCommsMessage] = useState<string | null>(null);

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

  // Footsteps. The 3D view says when the astronaut walks; for the 2D view the
  // page watches the movement keys and the joystick (the Phaser game is unchanged).
  useEffect(() => {
    if (mode === '3d') {
      const stop = bridge.on('walking', (walking) => audio.setWalking(walking));
      return () => {
        stop();
        audio.setWalking(false);
      };
    }
    const held = new Set<string>();
    const MOVE = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
    const down = (event: KeyboardEvent) => MOVE.includes(event.key.toLowerCase()) && held.add(event.key.toLowerCase());
    const up = (event: KeyboardEvent) => held.delete(event.key.toLowerCase());
    const clear = () => held.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    const timer = window.setInterval(() => {
      const stick = Math.hypot(bridge.input.x, bridge.input.y) > 0.2;
      audio.setWalking(!bridge.paused && (held.size > 0 || stick));
    }, 120);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      window.clearInterval(timer);
      audio.setWalking(false);
    };
  }, [mode, bridge]);

  // Keyboard shortcuts shown on the hotbar: M opens the map, Esc opens the menu.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (paused || (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'))) return;
      if (event.key === 'm' || event.key === 'M') setMapOpen(true);
      if (event.key === 'Escape') {
        // Without this, the same Esc press would reach the menu's own "close on Esc" and shut it at once.
        event.preventDefault();
        setMenuOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused]);

  // Tell the game what to draw, but only when something visible changed.
  const avatar = profile?.avatar ?? DEFAULT_AVATAR;
  const view = state ? buildView(state, avatar, settings.reduceMotion, solTarget(solSave)) : null;
  const viewKey = view ? JSON.stringify(view) : '';
  useEffect(() => {
    if (viewKey) bridge.setView(JSON.parse(viewKey) as GameView);
  }, [bridge, viewKey]);

  const closePanel = useCallback(() => setOpenEquipment(null), []);

  // The "message sent" note fades after a few seconds; the reply clock stays in the HUD.
  useEffect(() => {
    if (!commsMessage) return;
    const timer = setTimeout(() => setCommsMessage(null), 8000);
    return () => clearTimeout(timer);
  }, [commsMessage]);

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
    if (hit) setStormMessage({ text: stormResultText(hit), harmed: stormHarm(hit.choice, hit.severity) > 0, turn: hit.announcedSol });
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
        {mode === '3d' ? <Station3DView bridge={bridge} quality={quality} name={profile?.displayName} onFps={setFps} /> : <PhaserGame bridge={bridge} />}
      </Suspense>

      {/* Everything below floats over the game. Only the controls catch clicks. */}
      {/* Anchored to the edges: the top group to the top, the hotbar group to the bottom, so neither can push the other off screen. */}
      <div className="pointer-events-none absolute inset-0 p-2 sm:p-3">
        <h1 className="sr-only">NOLA Mission: your space station</h1>
        <div className="flex flex-col gap-2">
        <StatusBar state={state} />

        <div className="flex flex-wrap items-start justify-between gap-2 xl:flex-nowrap">
          <div className="flex flex-col gap-2">
            {solSave && (
              <section aria-label="Today's plan" className="pointer-events-auto w-60 max-w-[64vw] sm:w-64 rounded-2xl border-2 border-nola bg-hull/90 p-3 backdrop-blur">
                <p className="flex justify-between gap-2 text-xs font-bold uppercase tracking-widest text-nola-soft">
                  <span>
                    Sol {solSave.state.sol} of {SOL_LENGTH}
                  </span>
                  {missionRecord.loaded && <span className="text-mist">{missionRecord.rank.title}</span>}
                </p>
                <p aria-live="polite" className="text-sm font-semibold">
                  {solHint(solSave)}
                </p>
                <BodyStatus body={solSave.state.body} />
              </section>
            )}
            <EarthLinkPanel state={state} />
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
                <div role="status" className="pointer-events-auto max-h-[60vh] w-full max-w-[26rem] space-y-2 overflow-y-auto rounded-2xl border-2 border-nola bg-hull/95 p-3 text-sm font-semibold">
                  <p className="flex items-start gap-2">
                    <span className="flex-1">{stormMessage.text}</span>
                    <button type="button" onClick={() => setStormMessage(null)} className="font-bold text-nola-soft underline">
                      OK
                    </button>
                  </p>
                  {stormMessage.harmed &&
                    (() => {
                      const card = pickFinding(science, 'radiation', stormMessage.turn);
                      return card ? <AstronautScienceCard card={card} compact /> : null;
                    })()}
                </div>
              )
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => update({ muted: !settings.muted })}
              aria-pressed={!settings.muted}
              aria-label={settings.muted ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off'}
              className="pointer-events-auto flex h-12 items-center justify-center gap-2 self-end rounded-full border-2 border-line bg-hull/90 px-3 font-bold"
            >
              {settings.muted ? <VolumeX aria-hidden="true" size={20} /> : <Volume2 aria-hidden="true" size={20} />}
              <span aria-hidden="true" className="max-sm:hidden">{settings.muted ? 'Sound off' : 'Sound on'}</span>
            </button>
            <Link to={mode === '3d' ? '/mission2d' : '/mission'} onClick={sim.saveNow} className="pointer-events-auto flex h-12 items-center gap-2 rounded-full border-2 border-glow bg-hull/90 px-3 font-bold sm:px-4" aria-label={mode === '3d' ? '2D view' : '3D view'}>
              <Box aria-hidden="true" size={20} /> {mode === '3d' ? '2D' : '3D'}
              <span aria-hidden="true" className="max-sm:hidden">view</span>
            </Link>
            {mode === '3d' && (
              <div className="pointer-events-auto flex items-center gap-1 rounded-full border-2 border-line bg-hull/90 p-1 text-sm font-bold">
                <span className="sr-only">Graphics quality</span>
                {(['low', 'high'] as const).map((option) => (
                  <button key={option} type="button" aria-pressed={quality === option} onClick={() => changeQuality(option)} className={`min-h-9 rounded-full px-2.5 sm:px-3 ${quality === option ? 'bg-glow text-void' : 'text-mist'}`}>
                    {option === 'low' ? 'Low' : 'High'}
                  </button>
                ))}
                <span className="px-2 text-xs text-mist max-sm:hidden">{fps === null ? '…' : `${fps} FPS`}</span>
              </div>
            )}
          </div>
        </div>

        </div>

        <div className="absolute inset-x-2 bottom-2 flex flex-col gap-2 sm:inset-x-3 sm:bottom-3">
        {commsMessage && (
          <p role="status" className="pointer-events-auto w-fit max-w-md rounded-2xl border-2 border-glow bg-hull/95 px-3 py-2 text-sm font-semibold">
            {commsMessage}
          </p>
        )}
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="pointer-events-auto w-fit rounded-full bg-hull/90 px-3 py-1 text-sm font-bold" aria-live="polite">
            {room ? findRoom(room).name : 'Station'}
            {nearbyName ? ` · Near: ${nearbyName}` : ''}
          </p>
          <div className="order-first flex w-full min-w-0 justify-center sm:order-none sm:w-auto sm:flex-1">
            <NolaCaption state={state} />
          </div>
          {(() => {
            const step = openEquipment === 'console' ? null : tutorialStep(solSave, false);
            return step ? <TutorialCoach step={step} onSkip={solMission.skipTutorial} /> : null;
          })()}
        </div>
        {/* Bottom of the screen, inset from phone notches and home bars. */}
        <div className="pb-[env(safe-area-inset-bottom)]">
          <Hotbar
            state={state}
            nearbyName={nearbyName}
            onMap={() => setMapOpen(true)}
            onMenu={() => setMenuOpen(true)}
            onUse={() => nearby && setOpenEquipment(nearby)}
            onTurn={mode === '3d' ? () => bridge.pendingTurns.push(1) : undefined}
          />
          <p className="mt-1 hidden text-center text-xs font-semibold text-mist [@media(pointer:fine)]:block">
            Move: W A S D or arrow keys{mode === '3d' ? ' · Turn camera: Q / R' : ''}
          </p>
          {/* Touch screens: the joystick and the big Use button. */}
          <div className="mt-2 flex items-end justify-between gap-2 [@media(pointer:fine)]:hidden">
            <Joystick bridge={bridge} />
            <InteractButton label={nearbyName} onPress={() => nearby && setOpenEquipment(nearby)} />
          </div>
        </div>

        {sim.saveError && (
          <p role="alert" className="pointer-events-auto rounded-xl border-2 border-alert bg-hull px-3 py-1 text-sm font-semibold text-alert">
            Saving is not working right now. Your progress will be saved when the connection returns.
          </p>
        )}
        </div>
      </div>

      {openEquipment === 'console' && solSave ? (
        <SolBriefing save={solSave} unlocked={unlockedSystems} onPlan={solMission.plan} onSkip={solMission.skip} onFinish={solMission.finish} onClose={closePanel} tutorial={tutorialStep(solSave, true)} debrief={{ rank: missionRecord.rank, badges: missionRecord.badges }} />
      ) : (
        openEquipment && <EquipmentPanel id={openEquipment} state={state} dispatch={dispatch} weather={weather} onClose={closePanel} urgent={urgentHere} onSent={(text) => {
          closePanel();
          setCommsMessage(text);
        }} />
      )}

      <StationMapModal
        open={mapOpen}
        state={state}
        currentRoom={room}
        view={view}
        player={mapOpen ? bridge.playerPosition : null}
        nearby={nearby}
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
          <Link to={mode === '3d' ? '/mission2d' : '/mission'} className={buttonClasses('secondary')} onClick={sim.saveNow}>
            {mode === '3d' ? 'Switch to the 2D view' : 'Switch to the 3D view'}
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

/** /mission2d: the station game in 2D (Phaser), or a friendly locked screen before Module 1 is passed. The game opens in 3D by default (Mission3DPage). */
export default function MissionPage() {
  return <MissionGame mode="2d" />;
}

/** The station game in 2D (Phaser) or 3D (three.js). Missions, tasks, sols and saves are the same in both. */
export function MissionGame({ mode }: { mode: ViewMode }) {
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

  return <StationGame mode={mode} />;
}
