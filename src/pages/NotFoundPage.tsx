import { Link } from 'react-router';
import { buttonClasses } from '../components/Button';
import { NolaMascot } from '../features/companion/NolaMascot';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 text-center">
      <NolaMascot mood="curious" size={150} />
      <h1 className="text-3xl font-semibold">Lost in space!</h1>
      <p className="max-w-md text-lg text-mist">This page drifted away, or never existed. Let's head back to the station.</p>
      <Link to="/" className={buttonClasses('primary')}>
        Back to Mission Control
      </Link>
    </div>
  );
}
