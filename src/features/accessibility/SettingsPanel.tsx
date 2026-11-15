import { useId } from 'react';
import { OptionGroup, type Option } from '../../components/OptionGroup';
import { ReadAloudButton } from './ReadAloudButton';
import { useSettings } from './SettingsContext';
import type { SpeechRate, TextSize } from './settings';

const TEXT_SIZES: Option<TextSize>[] = [
  { id: 'normal', label: 'Normal', visual: <span aria-hidden="true" className="text-sm">A</span> },
  { id: 'large', label: 'Large', visual: <span aria-hidden="true" className="text-lg">A</span> },
  { id: 'xlarge', label: 'Extra large', visual: <span aria-hidden="true" className="text-2xl leading-none">A</span> },
];

const SPEECH_RATES: Option<SpeechRate>[] = [
  { id: 'slow', label: 'Slower' },
  { id: 'normal', label: 'Normal' },
];

interface ToggleProps {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** An on/off switch. Shows the words "On"/"Off" as well as the slider position. */
function Toggle({ label, hint, checked, onChange }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border-2 border-line bg-void/40 p-4">
      <div className="min-w-0">
        <label htmlFor={id} className="font-display text-lg font-medium">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-mist">
          {hint}
        </p>
      </div>
      <label
        htmlFor={id}
        className={`relative flex h-10 w-24 shrink-0 cursor-pointer items-center rounded-full border-2 px-3 text-sm font-bold transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-glow ${
          checked ? 'justify-start border-glow bg-glow/20 text-star' : 'justify-end border-line bg-void text-mist'
        }`}
      >
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="sr-only"
          checked={checked}
          aria-checked={checked}
          aria-describedby={`${id}-hint`}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span aria-hidden="true">{checked ? 'On' : 'Off'}</span>
        <span
          aria-hidden="true"
          className={`absolute top-1 h-7 w-7 rounded-full transition-all ${checked ? 'left-[3.6rem] bg-glow' : 'left-1 bg-mist'}`}
        />
      </label>
    </div>
  );
}

/** All accessibility controls. Every change applies instantly and is saved. */
export function SettingsPanel() {
  const { settings, update } = useSettings();
  const volumeId = useId();
  const musicId = useId();
  const sfxId = useId();

  return (
    <div className="space-y-6">
      <OptionGroup legend="Text size" options={TEXT_SIZES} value={settings.textSize} onChange={(textSize) => update({ textSize })} />

      <div className="grid gap-4 md:grid-cols-2">
        <Toggle
          label="High contrast"
          hint="Black background, white text and bright outlines."
          checked={settings.highContrast}
          onChange={(highContrast) => update({ highContrast })}
        />
        <Toggle
          label="Dyslexia-friendly font"
          hint="Switches all text to Lexend, a typeface made for easier reading, with wider spacing."
          checked={settings.dyslexiaFont}
          onChange={(dyslexiaFont) => update({ dyslexiaFont })}
        />
        <Toggle
          label="Reduce motion"
          hint="Stops floating, sliding and other animations."
          checked={settings.reduceMotion}
          onChange={(reduceMotion) => update({ reduceMotion })}
        />
        <Toggle
          label="Colour-blind friendly colours"
          hint="Shows good and bad as blue and amber instead of green and red. Icons and words always show it too."
          checked={settings.colorSafe}
          onChange={(colorSafe) => update({ colorSafe })}
        />
        <Toggle
          label="Read aloud"
          hint="Adds a Listen button to NOLA's speech bubbles."
          checked={settings.readAloud}
          onChange={(readAloud) => update({ readAloud })}
        />
      </div>

      <fieldset className="space-y-5 rounded-2xl border-2 border-line bg-void/40 p-4">
        <legend className="px-1 font-display text-lg font-medium">Music and sound</legend>
        <Toggle label="Mute all sound" hint="Turns off the music and footsteps. NOLA's read-aloud voice has its own setting." checked={settings.muted} onChange={(muted) => update({ muted })} />
        {(
          [
            ['musicVolume', 'Music volume', musicId],
            ['sfxVolume', 'Sound effects volume (footsteps)', sfxId],
          ] as const
        ).map(([key, label, id]) => (
          <div key={key}>
            <label htmlFor={id} className="mb-2 block font-display text-lg font-medium">
              {label}: {settings[key] === 0 ? 'off' : `${Math.round(settings[key] * 100)}%`}
            </label>
            <input
              id={id}
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(settings[key] * 100)}
              disabled={settings.muted}
              onChange={(event) => update({ [key]: Number(event.target.value) / 100 })}
              className="h-10 w-full max-w-md accent-nola disabled:opacity-50"
            />
          </div>
        ))}
        <p className="text-sm text-mist">Music starts after your first click, tap or key press. It is never needed to play: everything is also shown as text.</p>
      </fieldset>

      {settings.readAloud && (
        <div className="space-y-5 rounded-2xl border-2 border-line bg-void/40 p-4">
          <OptionGroup
            legend="Reading speed"
            options={SPEECH_RATES}
            value={settings.speechRate}
            onChange={(speechRate) => update({ speechRate })}
          />
          <div>
            <label htmlFor={volumeId} className="mb-2 block font-display text-lg font-medium">
              Voice volume: {Math.round(settings.voiceVolume * 100)}%
            </label>
            <input
              id={volumeId}
              type="range"
              min={0}
              max={100}
              step={10}
              value={Math.round(settings.voiceVolume * 100)}
              onChange={(event) => update({ voiceVolume: Number(event.target.value) / 100 })}
              className="h-10 w-full max-w-md accent-nola"
            />
          </div>
          <div className="rounded-2xl bg-star p-3">
            <ReadAloudButton text="Hello! I'm NOLA. This is how my voice sounds." />
            <span className="ml-3 font-semibold text-void">Test the voice</span>
          </div>
        </div>
      )}
    </div>
  );
}
