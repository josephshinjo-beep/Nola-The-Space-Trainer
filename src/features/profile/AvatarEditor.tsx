import { Loader } from '../../components/Loader';
import { useState } from 'react';
import { OptionGroup, type Option } from '../../components/OptionGroup';
import { updateAvatar } from '../../services/userRepository';
import { useAuth } from '../auth/AuthContext';
import { AstronautAvatar } from './AstronautAvatar';
import {
  ACCESSORIES,
  applySuitStyle,
  SUIT_COLORS,
  SUIT_STYLES,
  type SuitStyleId,
  VISOR_COLORS,
  type AccessoryId,
  type AvatarConfig,
  type ColorOption,
  type SuitColorId,
  type VisorColorId,
} from './avatarOptions';

function colorOptions<T extends string>(colors: readonly (ColorOption & { id: T })[]): Option<T>[] {
  return colors.map((color) => ({
    id: color.id,
    label: color.label,
    visual: (
      <span aria-hidden="true" className="h-6 w-6 rounded-full border-2 border-star" style={{ backgroundColor: color.hex }} />
    ),
  }));
}

const SUIT_OPTIONS = colorOptions<SuitColorId>(SUIT_COLORS);
const VISOR_OPTIONS = colorOptions<VisorColorId>(VISOR_COLORS);
const ACCESSORY_OPTIONS: Option<AccessoryId>[] = ACCESSORIES.map(({ id, label }) => ({ id, label }));

/** Lets the student design their astronaut. Each choice saves straight away. */
export function AvatarEditor() {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  if (!user || !profile) return <Loader variant="inline" label="Loading your astronaut…" />;
  const avatar = profile.avatar;

  function change(changes: Partial<AvatarConfig>) {
    if (!user) return;
    setStatus('idle');
    updateAvatar(user.uid, { ...avatar, ...changes })
      .then(() => setStatus('saved'))
      .catch((error) => {
        console.error('Could not save avatar', error);
        setStatus('error');
      });
  }

  return (
    <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-start">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-[2rem] border-2 border-line bg-void/60 p-6">
          <AstronautAvatar avatar={avatar} size={150} />
        </div>
        <p role="status" className="min-h-6 font-semibold">
          {status === 'saved' && (
            <span className="text-go">
              <span aria-hidden="true">✓ </span>Saved
            </span>
          )}
          {status === 'error' && (
            <span className="text-alert">
              <span aria-hidden="true">⚠ </span>Not saved. Check your connection.
            </span>
          )}
        </p>
      </div>

      <div className="space-y-6">
        <OptionGroup
          legend="Suit style"
          options={SUIT_STYLES.map((style) => ({
            id: style.id,
            label: style.label,
            // A small preview of the whole suit, in this student's accessory.
            visual: <AstronautAvatar avatar={{ ...applySuitStyle(avatar, style.id), accessory: 'none' }} size={34} className="shrink-0" />,
          }))}
          value={avatar.suitStyle}
          onChange={(suitStyle: SuitStyleId) => change(applySuitStyle(avatar, suitStyle))}
        />
        {avatar.suitStyle === 'my-colours' ? (
          <>
            <OptionGroup legend="Suit colour" options={SUIT_OPTIONS} value={avatar.suitColor} onChange={(suitColor) => change({ suitColor })} />
            <OptionGroup legend="Visor colour" options={VISOR_OPTIONS} value={avatar.visorColor} onChange={(visorColor) => change({ visorColor })} />
          </>
        ) : (
          <p className="rounded-2xl border-2 border-line bg-void/50 p-3 text-base text-mist">This suit style sets every colour. To pick your own suit and visor colours, choose “My colours”.</p>
        )}
        <OptionGroup legend="Accessory" options={ACCESSORY_OPTIONS} value={avatar.accessory} onChange={(accessory) => change({ accessory })} />
      </div>
    </div>
  );
}
