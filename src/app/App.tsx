import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from '../features/auth/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { MissionControlPage } from '../pages/MissionControlPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProfilePage } from '../pages/ProfilePage';
import { UnderConstructionPage } from '../pages/UnderConstructionPage';
import { AppLayout } from './AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './RouteGuards';

/** The route map: which page shows at which address, and who may see it. */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<MissionControlPage />} />
              <Route
                path="/academy"
                element={
                  <UnderConstructionPage
                    title="NOLA Academy"
                    message="My classroom isn't open yet! Soon you'll learn how astronauts grow food, make oxygen and stay safe."
                    planned={[
                      'Six space survival lessons',
                      'Activities and short quizzes',
                      'Passing a lesson unlocks part of your station',
                    ]}
                  />
                }
              />
              <Route
                path="/mission"
                element={
                  <UnderConstructionPage
                    title="NOLA Mission"
                    message="The station is still being bolted together. When it's ready, you'll walk around it and keep the crew alive!"
                    planned={[
                      'A space station to explore',
                      'Food, oxygen, energy and water to manage',
                      'Missions and mini-games',
                    ]}
                  />
                }
              />
              <Route
                path="/companion"
                element={
                  <UnderConstructionPage
                    title="Ask NOLA"
                    message="I'm still learning how to chat. Soon you'll be able to ask me anything about surviving in space."
                    planned={['Chat with NOLA', 'Hints for lessons and missions']}
                  />
                }
              />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
