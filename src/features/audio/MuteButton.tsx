import { Volume2, VolumeX } from 'lucide-react';
import { useSettings } from '../accessibility/SettingsContext';

/**
 * One switch for every sound: music, sound effects and NOLA reading by
 * herself. "rail" fits the side panel (icon, with a label that shows when it
 * opens); "round" is a plain icon button for top bars.
 */
export function MuteButton({ variant = 'round', className = '', labelClassName = '' }: { variant?: 'round' | 'rail'; className?: string; labelClassName?: string }) {
  const { settings, update } = useSettings();
  const muted = settings.muted;
  const Icon = muted ? VolumeX : Volume2;
  return (
    <button
      type="button"
      onClick={() => update({ muted: !muted })}
      aria-pressed={muted}
      aria-label={muted ? 'Sound is off. Turn sound on' : 'Sound is on. Mute all sound'}
      title={muted ? 'Turn sound on' : 'Mute all sound'}
      className={
        variant === 'round'
          ? `flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition ${muted ? 'border-alert/60 text-alert' : 'border-line text-mist hover:border-glow hover:text-star'} ${className}`
          : className
      }
    >
      <Icon aria-hidden="true" size={variant === 'round' ? 20 : 22} className="shrink-0" />
      {variant === 'rail' && <span className={labelClassName}>{muted ? 'Sound off' : 'Sound on'}</span>}
    </button>
  );
}
