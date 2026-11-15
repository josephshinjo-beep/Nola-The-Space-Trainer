import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { SettingsProvider } from '../features/accessibility/SettingsContext';
import { AuthProvider } from '../features/auth/AuthContext';
import { SoundDirector } from '../features/audio/SoundDirector';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { MissionControlPage } from '../pages/MissionControlPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AppLayout } from './AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './RouteGuards';

// Pages load the first time they are visited, so the first screen downloads
// less. The home page and the sign-in pages stay in the main bundle.
const MissionPage = lazy(() => import('../pages/MissionPage'));
const Mission3DPage = lazy(() => import('../pages/Mission3DPage'));
const AcademyPage = lazy(() => import('../pages/AcademyPage').then((m) => ({ default: m.AcademyPage })));
const ModulePage = lazy(() => import('../pages/ModulePage').then((m) => ({ default: m.ModulePage })));
const LessonPage = lazy(() => import('../pages/LessonPage').then((m) => ({ default: m.LessonPage })));
const CompanionPage = lazy(() => import('../pages/CompanionPage').then((m) => ({ default: m.CompanionPage })));
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const AccessibilityPage = lazy(() => import('../pages/AccessibilityPage').then((m) => ({ default: m.AccessibilityPage })));
const DataSourcesPage = lazy(() => import('../pages/DataSourcesPage').then((m) => ({ default: m.DataSourcesPage })));

/** Shows a short message while a page's code downloads. */
const page = (element: React.ReactNode) => (
  <Suspense
    fallback={
      <p role="status" className="p-6 text-xl text-mist">
        Loading…
      </p>
    }
  >
    {element}
  </Suspense>
);

/** The route map: which page shows at which address, and who may see it. */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <SoundDirector />
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<MissionControlPage />} />
                <Route path="/academy" element={page(<AcademyPage />)} />
                <Route path="/academy/:moduleId" element={page(<ModulePage />)} />
                <Route path="/academy/:moduleId/lesson" element={page(<LessonPage />)} />
                <Route path="/mission" element={page(<MissionPage />)} />
                <Route path="/mission3d" element={page(<Mission3DPage />)} />
                <Route path="/companion" element={page(<CompanionPage />)} />
                <Route path="/profile" element={page(<ProfilePage />)} />
              </Route>
            </Route>

            <Route path="/accessibility" element={page(<AccessibilityPage />)} />
            <Route path="/data-sources" element={page(<DataSourcesPage />)} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
