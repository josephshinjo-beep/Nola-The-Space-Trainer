import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { buttonClasses } from '../components/Button';
import { useAcademyProgress } from '../features/academy/AcademyProgressContext';
import { loadLesson } from '../features/academy/content';
import { findModule } from '../features/academy/curriculum';
import { LessonPlayer } from '../features/academy/lesson/LessonPlayer';
import type { Lesson } from '../features/academy/lessonTypes';
import { moduleStatus } from '../features/academy/progress';

/** Loads a lesson's content and progress, then hands over to the lesson player. */
export function LessonPage() {
  const { moduleId } = useParams();
  const module = findModule(moduleId);
  const { progress, loaded } = useAcademyProgress();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLesson(null);
    setFailed(false);
    if (!moduleId) return;
    loadLesson(moduleId)
      .then((content) => !cancelled && setLesson(content))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  if (!module || failed) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Lesson not found</h1>
        <Link to="/academy" className={buttonClasses('secondary')}>
          Back to the Academy
        </Link>
      </div>
    );
  }

  if (!loaded || !lesson) {
    return (
      <p role="status" className="text-xl text-mist">
        Loading your lesson…
      </p>
    );
  }

  if (moduleStatus(module, progress) === 'locked') {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">{module.title} is locked</h1>
        <p className="text-lg text-mist">Complete the module before it on the training path to open this one.</p>
        <Link to="/academy" className={buttonClasses('primary')}>
          See the training path
        </Link>
      </div>
    );
  }

  // The key makes a fresh player if the student restarts this lesson.
  return <LessonPlayer key={`${module.id}-${progress[module.id] ? 'saved' : 'new'}`} module={module} lesson={lesson} />;
}
