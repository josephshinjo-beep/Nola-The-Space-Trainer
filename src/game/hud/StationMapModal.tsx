import { Lock, MapPin, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../components/Button';
import { Modal } from '../../components/ConfirmDialog';
import { moduleForSystem } from '../../features/unlocks/unlockManager';
import type { RoomId, StationState } from '../../simulation/types';
import { EQUIPMENT, ROOMS, type EquipmentId } from '../stationMap';

interface StationMapModalProps {
  open: boolean;
  state: StationState;
  currentRoom: RoomId | null;
  onTravel: (id: EquipmentId) => void;
  onClose: () => void;
}

/**
 * The station map. It is also the simplified way to move: choosing a
 * machine takes the astronaut straight to it, so the game can be played
 * without steering.
 */
export function StationMapModal({ open, state, currentRoom, onTravel, onClose }: StationMapModalProps) {
  const order: RoomId[] = ['oxygen', 'hydroponics', 'power', 'comms', 'corridor', 'water', 'medical', 'thermal', 'shelter'];

  return (
    <Modal open={open} title="Station map" onClose={onClose} wide>
      <p className="mb-4 text-mist">Choose a machine to go straight to it.</p>
      <ul className="grid gap-3 sm:grid-cols-4">
        {order.map((roomId) => {
          const room = ROOMS.find((candidate) => candidate.id === roomId);
          if (!room) return null;
          const locked = !state.unlocked.includes(room.system);
          const module = locked ? moduleForSystem(room.system) : undefined;
          const here = currentRoom === room.id;
          return (
            <li key={room.id} className={`rounded-2xl border-2 p-3 ${room.id === 'corridor' ? 'sm:col-span-4' : ''} ${here ? 'border-nola bg-nola/10' : 'border-line bg-void/50'}`}>
              <h3 className="flex flex-wrap items-center gap-2 font-display text-lg font-medium">
                {room.name}
                {here && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-nola px-2 py-0.5 text-xs font-bold text-void">
                    <MapPin aria-hidden="true" size={12} /> You are here
                  </span>
                )}
              </h3>
              {locked ? (
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
