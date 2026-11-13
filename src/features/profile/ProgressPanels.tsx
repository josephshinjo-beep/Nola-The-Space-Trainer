import { Check, Lock } from 'lucide-react';
import { Link } from 'react-router';
import { computeAchievements, type StationStats } from '../academy/achievements';
import { useAcademyProgress } from '../academy/AcademyProgressContext';
import { CURRICULUM } from '../academy/curriculum';
import { moduleStatus } from '../academy/progress';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/** Badge wall. Earned badges are bright with a tick; the rest show how to earn them. */
export function AchievementsPanel({ station }: { station: StationStats | null }) {
  const { progress } = useAcademyProgress();
  const achievements = computeAchievements(progress, station);
  const earned = achievements.filter((achievement) => achievement.earned).length;

  return (
    <div>
      <p className="mb-4 text-lg text-mist">
        {earned} of {achievements.length} earned
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {achievements.map(({ id, title, description, icon: Icon, earned: got }) => (
          <li key={id} className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${got ? 'border-nola bg-nola/10' : 'border-line bg-void/40'}`}>
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${got ? 'bg-nola text-void' : 'bg-panel text-mist'}`}>
              <Icon aria-hidden="true" size={26} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-display text-lg font-medium">
                {title}
                {got ? <Check aria-hidden="true" size={18} className="text-go" /> : <Lock aria-hidden="true" size={14} className="text-mist" />}
                <span className="sr-only">{got ? '(earned)' : '(not earned yet)'}</span>
              </span>
              <span className="block text-mist">{description}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Every module with its status, best score and completion date. */
export function LearningHistoryPanel() {
  const { progress } = useAcademyProgress();
  return (
    <ul className="divide-y-2 divide-line">
      {CURRICULUM.map((module) => {
        const status = moduleStatus(module, progress);
        const record = progress[module.id];
        return (
          <li key={module.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
            <Link to={`/academy/${module.id}`} className="font-display text-lg font-medium text-star underline-offset-4 hover:underline">
              {module.number}. {module.title}
            </Link>
            <span className="text-mist">
              {status === 'completed'
                ? `Completed${record?.completedAt ? ` ${dateFormat.format(record.completedAt)}` : ''}`
                : status === 'in-progress'
                  ? 'In progress'
                  : status === 'available'
                    ? 'Ready to start'
                    : 'Locked'}
              {record?.bestScore != null && record.quizTotal != null && ` · Best score ${record.bestScore}/${record.quizTotal}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
