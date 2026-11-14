import { TriangleAlert } from 'lucide-react';
import { SOL_CONFIG } from '../../sol/config';
import type { BodyPart, SolState } from '../../sol/types';
import { LINE_LABELS } from './cards';
import { ExplainButton } from './ResourceExplainer';

const LOW: Record<BodyPart, number> = { muscleBone: SOL_CONFIG.body.lowMuscleBone.value, rest: SOL_CONFIG.body.lowRest.value };

/**
 * The crew's body in the HUD. A low value says LOW in words and shows a
 * warning triangle, so it never depends on colour alone.
 */
export function BodyStatus({ body }: { body: SolState['body'] }) {
  return (
    <ul className="mt-1 space-y-0.5 text-xs">
      {(['muscleBone', 'rest'] as const).map((part) => {
        const value = Math.round(body[part]);
        const low = value < LOW[part];
        const Icon = LINE_LABELS[part].icon;
        return (
          <li key={part} className={`flex items-center gap-1 ${low ? 'font-bold text-alert' : 'text-mist'}`}>
            {low ? <TriangleAlert aria-hidden="true" size={14} /> : <Icon aria-hidden="true" size={14} />}
            {LINE_LABELS[part].name} {value}%{low ? ' LOW' : ''}
            <ExplainButton resource={part} className="ml-auto h-6 w-6" />
          </li>
        );
      })}
    </ul>
  );
}
