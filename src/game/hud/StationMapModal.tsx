import { Lock, MapPin, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../components/Button';
import { Modal } from '../../components/ConfirmDialog';
import { moduleForSystem } from '../../features/unlocks/unlockManager';
import type { RoomId, StationState } from '../../simulation/types';
import type { GameView } from '../GameBridge';
import { COLS, EQUIPMENT, findEquipment, ROOMS, ROWS, standingSpot, TILE, type EquipmentId } from '../stationMap';

interface StationMapModalProps {
  open: boolean;
  state: StationState;
  currentRoom: RoomId | null;
  /** What the game is showing: the next task, today's urgent job and broken machines. */
  view: GameView | null;
  /** Where the astronaut stands in tiles, when the view reports it (the 3D view does). */
  player: { x: number; y: number } | null;
  /** The machine the astronaut is next to, for placing "You are here" when there is no exact position. */
  nearby: EquipmentId | null;
  onTravel: (id: EquipmentId) => void;
  onClose: () => void;
}

/** Room floors on the map: the game's tint, lightened so rooms read clearly. */
const lighten = (color: number, amount: number) => {
  const channel = (shift: number) => Math.min(255, Math.round(((color >> shift) & 255) + (255 - ((color >> shift) & 255)) * amount));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
};

/** A diamond marker centred on (x, y). */
const diamond = (x: number, y: number, size: number) => `M ${x} ${y - size} L ${x + size * 0.72} ${y} L ${x} ${y + size} L ${x - size * 0.72} ${y} Z`;

/**
 * The station map: a drawn plan of the station with live markers, and the
 * simplified way to move (choose a machine to go straight to it), so the
 * game can be played without steering. The list below the plan offers the
 * same choices for keyboard and screen-reader users.
 */
export function StationMapModal({ open, state, currentRoom, view, player, nearby, onTravel, onClose }: StationMapModalProps) {
  const order: RoomId[] = ['oxygen', 'hydroponics', 'power', 'comms', 'corridor', 'water', 'medical', 'thermal', 'shelter'];
  const locked = (roomId: RoomId) => {
    const room = ROOMS.find((candidate) => candidate.id === roomId)!;
    return !state.unlocked.includes(room.system);
  };
  // "You are here": the exact spot when known, otherwise next to the nearby machine, otherwise the room's centre.
  const here = (() => {
    if (player) return player;
    if (nearby) {
      const spot = standingSpot(findEquipment(nearby));
      return { x: spot.x / TILE, y: spot.y / TILE };
    }
    const room = currentRoom ? ROOMS.find((candidate) => candidate.id === currentRoom) : undefined;
    return room ? { x: (room.x1 + room.x2 + 1) / 2, y: (room.y1 + room.y2 + 1) / 2 } : null;
  })();
  const storm = state.storm !== null && state.unlocked.includes('radiation');
  const shelter = ROOMS.find((room) => room.id === 'shelter')!;

  return (
    <Modal open={open} title="Station map" onClose={onClose} wide>
      <p className="mb-3 text-mist">Choose a machine on the map or in the list to go straight to it.</p>

      <figure className="overflow-hidden rounded-2xl border-2 border-line bg-void">
        <svg viewBox={`0 0 ${COLS} ${ROWS}`} className="block h-auto w-full" role="group" aria-label="Plan of the station">
          <defs>
            <pattern id="map-locked" width="0.6" height="0.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="0.6" height="0.6" fill="#0b1024" />
              <rect width="0.25" height="0.6" fill="#232c4a" />
            </pattern>
            <pattern id="map-grid" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M 1 0 L 0 0 0 1" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.04" />
            </pattern>
          </defs>

          {/* Rooms and corridor, with a faint tile grid. */}
          {ROOMS.map((room) => {
            const isLocked = locked(room.id);
            const isHere = currentRoom === room.id;
            const w = room.x2 - room.x1 + 1;
            const h = room.y2 - room.y1 + 1;
            const module = isLocked ? moduleForSystem(room.system) : undefined;
            return (
              <g key={room.id}>
                <rect x={room.x1} y={room.y1} width={w} height={h} rx="0.3" fill={isLocked ? 'url(#map-locked)' : lighten(room.color, 0.12)} stroke={isHere ? '#ff7a1a' : '#3b4a86'} strokeWidth={isHere ? 0.22 : 0.12} />
                {!isLocked && <rect x={room.x1} y={room.y1} width={w} height={h} fill="url(#map-grid)" pointerEvents="none" />}
                <text x={room.x1 + w / 2} y={room.y1 + h / 2 + (isLocked ? -0.15 : 0.22)} textAnchor="middle" fontSize="0.62" fontWeight="700" fill={isLocked ? '#7f8bb3' : '#e6ecff'} pointerEvents="none">
                  {room.name.toUpperCase()}
                </text>
                {isLocked && (
                  <text x={room.x1 + w / 2} y={room.y1 + h / 2 + 0.7} textAnchor="middle" fontSize="0.55" fill="#ffb070" pointerEvents="none">
                    🔒 Locked{module ? `: pass Module ${module.number}` : ''}
                  </text>
                )}
                {room.door.map((door) => (
                  <rect key={`${door.x},${door.y}`} x={door.x + 0.08} y={door.y + 0.08} width="0.84" height="0.84" rx="0.12" fill={isLocked ? '#c4552a' : lighten(room.color, 0.12)} stroke={isLocked ? '#ffb070' : 'none'} strokeWidth="0.06" />
                ))}
              </g>
            );
          })}

          {/* A solar storm: the shelter pulses. */}
          {storm && (
            <g pointerEvents="none">
              <rect x={shelter.x1 - 0.2} y={shelter.y1 - 0.2} width={shelter.x2 - shelter.x1 + 1.4} height={shelter.y2 - shelter.y1 + 1.4} rx="0.5" fill="none" stroke="#ffd23f" strokeWidth="0.18" className="animate-pulse" />
              <text x={(shelter.x1 + shelter.x2 + 1) / 2} y={shelter.y2 + 0.65} textAnchor="middle" fontSize="0.6" fontWeight="700" fill="#ffd23f">
                ☢ Solar storm: shelter here
              </text>
            </g>
          )}

          {/* Machines: choose one to travel there. */}
          {EQUIPMENT.map((item) => {
            const isLocked = locked(item.room);
            const broken = view?.alerts.includes(item.id) ?? item.faults.some((fault) => state.faults.includes(fault));
            const isTarget = view?.target === item.id;
            const isUrgent = view?.urgent === item.id;
            const travel = () => !isLocked && onTravel(item.id);
            return (
              <g
                key={item.id}
                role="button"
                tabIndex={isLocked ? -1 : 0}
                aria-label={`${item.name}${broken ? ', needs repair' : ''}${isTarget ? ', next mission task' : ''}${isUrgent ? ", today's urgent job" : ''}${isLocked ? ', locked' : ''}`}
                aria-disabled={isLocked}
                onClick={travel}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    travel();
                  }
                }}
                className={isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer outline-none [&:focus-visible>rect:first-child]:stroke-[#3de0f5] [&:hover>rect:first-child]:stroke-[#3de0f5]'}
              >
                <rect x={item.x + 0.06} y={item.y + 0.06} width="0.88" height="0.88" rx="0.16" fill="#1a2547" stroke={broken ? '#ff4d5e' : '#8fa4e8'} strokeWidth="0.08" />
                <text x={item.x + 0.5} y={item.y + 0.62} textAnchor="middle" fontSize="0.32" fontWeight="700" fill="#cfe9ff" pointerEvents="none">
                  {item.glyph}
                </text>
                {broken && (
                  <g pointerEvents="none">
                    <circle cx={item.x + 0.92} cy={item.y + 0.08} r="0.3" fill="#ff4d5e" />
                    <text x={item.x + 0.92} y={item.y + 0.2} textAnchor="middle" fontSize="0.38" fontWeight="900" fill="#fff">
                      !
                    </text>
                  </g>
                )}
                {isTarget && <path d={diamond(item.x + 0.5, item.y - 0.55, 0.42)} fill="#ffd23f" stroke="#070b1f" strokeWidth="0.06" pointerEvents="none" className="animate-pulse" />}
                {isUrgent && !isTarget && <path d={diamond(item.x + 0.5, item.y - 0.55, 0.42)} fill="#ff7a1a" stroke="#070b1f" strokeWidth="0.06" pointerEvents="none" className="animate-pulse" />}
              </g>
            );
          })}

          {/* You are here. */}
          {here && (
            <g pointerEvents="none">
              <circle cx={here.x} cy={here.y} r="0.7" fill="rgba(61,224,245,0.18)" className="animate-ping origin-center" style={{ transformBox: 'fill-box' }} />
              <circle cx={here.x} cy={here.y} r="0.34" fill="#3de0f5" stroke="#070b1f" strokeWidth="0.1" />
            </g>
          )}
        </svg>

        {/* Legend: every marker has a shape and a word, not only a colour. */}
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 border-t-2 border-line px-3 py-2 text-sm text-mist">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full bg-glow" /> You are here
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 w-3 rotate-45 bg-[#ffd23f]" /> Next mission task
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 w-3 rotate-45 bg-nola" /> Today’s urgent job
          </span>
          <span className="flex items-center gap-1.5">
            <TriangleAlert aria-hidden="true" size={14} className="text-alert" /> Needs repair
          </span>
          <span className="flex items-center gap-1.5">
            <Lock aria-hidden="true" size={14} /> Locked room
          </span>
        </figcaption>
      </figure>

      <ul className="mt-4 grid gap-3 sm:grid-cols-4">
        {order.map((roomId) => {
          const room = ROOMS.find((candidate) => candidate.id === roomId);
          if (!room) return null;
          const isLocked = locked(room.id);
          const module = isLocked ? moduleForSystem(room.system) : undefined;
          const isHere = currentRoom === room.id;
          return (
            <li key={room.id} className={`rounded-2xl border-2 p-3 ${room.id === 'corridor' ? 'sm:col-span-4' : ''} ${isHere ? 'border-nola bg-nola/10' : 'border-line bg-void/50'}`}>
              <h3 className="flex flex-wrap items-center gap-2 font-display text-lg font-medium">
                {room.name}
                {isHere && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-nola px-2 py-0.5 text-xs font-bold text-void">
                    <MapPin aria-hidden="true" size={12} /> You are here
                  </span>
                )}
              </h3>
              {isLocked ? (
                <p className="mt-1 text-sm text-mist">
                  <Lock aria-hidden="true" size={14} className="mr-1 inline" />
                  Locked.{' '}
                  {module && (
                    <Link to={`/academy/${module.id}`} className="font-bold text-glow underline">
                      Pass Module {module.number}
                    </Link>
                  )}
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {EQUIPMENT.filter((item) => item.room === room.id).map((item) => {
                    const broken = item.faults.some((fault) => state.faults.includes(fault));
                    return (
                      <Button key={item.id} variant="secondary" className="!min-h-11 !px-3 !py-1 !text-sm" onClick={() => onTravel(item.id)}>
                        {broken && <TriangleAlert aria-hidden="true" size={16} className="text-alert" />}
                        {item.name}
                        {broken && <span className="sr-only">(needs repair)</span>}
                      </Button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
