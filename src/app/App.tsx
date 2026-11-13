import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { SettingsProvider } from '../features/accessibility/SettingsContext';
import { AuthProvider } from '../features/auth/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { AcademyPage } from '../pages/AcademyPage';
import { AccessibilityPage } from '../pages/AccessibilityPage';
import { CompanionPage } from '../pages/CompanionPage';
import { MissionControlPage } from '../pages/MissionControlPage';
import { ModulePage } from '../pages/ModulePage';
import { LessonPage } from '../pages/LessonPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AppLayout } from './AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './RouteGuards';

const MissionPage = lazy(() => import('../pages/MissionPage'));

/** The route map: which page shows at which address, and who may see it. */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<MissionControlPage />} />
                <Route path="/academy" element={<AcademyPage />} />
                <Route path="/academy/:moduleId" element={<ModulePage />} />
                <Route path="/academy/:moduleId/lesson" element={<LessonPage />} />
                <Route
                  path="/mission"
                  element={
                    <Suspense fallback={<p className="p-6 text-xl text-mist">Loading…</p>}>
                      <MissionPage />
                    </Suspense>
                  }
                />
                <Route path="/companion" element={<CompanionPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            <Route path="/accessibility" element={<AccessibilityPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
