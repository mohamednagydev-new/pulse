import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './store/auth';
import TabBar from './components/TabBar';
import Confetti from './components/Confetti';
import Toaster from './components/Toaster';
import DesktopGate from './components/DesktopGate';
import InstallPrompt from './components/InstallPrompt';
import { getSocket } from './lib/socket';
import { celebrateFeedback } from './lib/haptics';
import { track } from './lib/track';

const TAB_ROUTES = ['/', '/programs', '/community', '/wellness', '/profile'];
import AppLayout from './components/AppLayout';
import Splash from './components/Splash';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import ProgramsHome from './pages/programs/ProgramsHome';
import WorkoutHub from './pages/programs/WorkoutHub';
import YogaHub from './pages/programs/YogaHub';
import Schedule from './pages/programs/Schedule';
import WorkoutSession from './pages/programs/WorkoutSession';
import CoachPage from './pages/programs/CoachPage';
import ProgramPage from './pages/programs/ProgramPage';
import LessonPage from './pages/programs/LessonPage';
import ExercisesPage from './pages/programs/ExercisesPage';
import MuscleGroupPage from './pages/programs/MuscleGroupPage';
import WellnessHome from './pages/wellness/WellnessHome';
import WellnessSection from './pages/wellness/WellnessSection';
import CategoryPage from './pages/wellness/CategoryPage';
import RecipePage from './pages/wellness/RecipePage';
import ArticlePage from './pages/wellness/ArticlePage';
import Profile from './pages/Profile';
import Info from './pages/Info';
import SearchPage from './pages/SearchPage';
import Bookmarks from './pages/Bookmarks';
import ProgramsDone from './pages/ProgramsDone';
import Buddies from './pages/social/Buddies';
import Reels from './pages/Reels';
import Notifications from './pages/Notifications';
import Store from './pages/Store';
import Deals from './pages/Deals';
import Events from './pages/Events';
import Leagues from './pages/Leagues';
import PartnerPage from './pages/PartnerPage';
import Help from './pages/Help';
import Tracker from './pages/Tracker';
import MealPlan from './pages/MealPlan';
import Venues from './pages/Venues';
import Progress from './pages/Progress';
import Achievements from './pages/Achievements';
import Leaderboard from './pages/Leaderboard';
import MusicGallery from './pages/MusicGallery';
import AdminHome from './pages/admin/AdminHome';
import AdminResource from './pages/admin/AdminResource';
import AdminUpload from './pages/admin/AdminUpload';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminReels from './pages/admin/AdminReels';
import AdminLeads from './pages/admin/AdminLeads';
import AdminVideoImport from './pages/admin/AdminVideoImport';
import AdminSupport from './pages/admin/AdminSupport';
import Support from './pages/Support';
import Assessment from './pages/Assessment';
import Community from './pages/social/Community';
import People from './pages/social/People';
import UserProfile from './pages/social/UserProfile';
import ChatList from './pages/social/ChatList';
import ChatRoom from './pages/social/ChatRoom';
import ChallengeRoom from './pages/social/ChallengeRoom';
import CoachesDirectory from './pages/social/CoachesDirectory';
import CoachProfileEdit from './pages/social/CoachProfileEdit';
import CoachDashboard from './pages/social/CoachDashboard';
import CoachProgramDetail from './pages/social/CoachProgramDetail';
import GroupSessions from './pages/social/GroupSessions';
import GroupSessionDetail from './pages/social/GroupSessionDetail';

function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const location = useLocation();

  if (status === 'authed') {
    /**
     * No intake gate. Signed-in users go wherever they like.
     *
     * This used to force anyone with `onboarded === false` to /my-plan before they
     * could see a single screen. It made the funnel nine questions deep before the
     * app had shown its value, and every one of those questions is a place to leave.
     * Worse, it was a trap: with a stale flag, every tap bounced back to the intake
     * and Back walked out of the site entirely.
     *
     * The intake is now asked for where it actually matters — when someone starts a
     * programme, in PlanPrompt — plus the standing card on Home. Browsing first and
     * committing second is the right order: by the time we ask what hurts, they have
     * seen why we want to know.
     */
    return <>{children}</>;
  }

  if (status === 'loading' || status === 'idle') return <Splash />;
  // Pre-login only: the intro slides are a pitch, so per-device is the right scope.
  const seenIntro = localStorage.getItem('fitit_onboarded');
  return <Navigate to={seenIntro ? '/login' : '/onboarding'} replace state={{ from: location }} />;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === 'loading' || status === 'idle') return <Splash />;
  if (status !== 'authed') return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { status, bootstrap } = useAuth();
  const started = useRef(false);
  const location = useLocation();

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      bootstrap();
    }
  }, [bootstrap]);

  // Reset scroll on navigation + screen-view analytics
  useEffect(() => {
    window.scrollTo(0, 0);
    if (useAuth.getState().status === 'authed') {
      // Normalize dynamic segments so screens group cleanly (e.g. /recipe/:id).
      const path = location.pathname.replace(/\/[a-z0-9]{20,}/gi, '/:id');
      track('screen', path);
    }
  }, [location.pathname]);

  return (
    <>
      <DesktopBackdrop />
      <Toaster />
      <div className="app-frame">
      {/* Enter-only transition. An exit animation with mode="wait" could leave the
          next route unmounted if the outgoing page stalled (e.g. tearing down the
          reels videos) — which showed as a blank screen until refresh. */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.6 }}
      >
      <Routes location={location}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/programs" element={<ProgramsHome />} />
          <Route path="/community" element={<Community />} />
          <Route path="/wellness" element={<WellnessHome />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route
          element={
            <RequireAuth>
              <PlainOutlet />
            </RequireAuth>
          }
        >
          <Route path="/workout" element={<WorkoutHub />} />
          <Route path="/yoga" element={<YogaHub />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/session/:groupId" element={<WorkoutSession />} />
          <Route path="/session/w/:workoutId" element={<WorkoutSession />} />
          <Route path="/programs/coach/:id" element={<CoachPage />} />
          <Route path="/programs/:id" element={<ProgramPage />} />
          <Route path="/lesson/:id" element={<LessonPage />} />
          <Route path="/exercises" element={<ExercisesPage />} />
          <Route path="/exercises/:groupId" element={<MuscleGroupPage />} />
          <Route path="/wellness/:kind" element={<WellnessSection />} />
          <Route path="/category/:id" element={<CategoryPage />} />
          <Route path="/recipe/:id" element={<RecipePage />} />
          <Route path="/article/:id" element={<ArticlePage />} />
          <Route path="/info" element={<Info />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/meals" element={<MealPlan />} />
          <Route path="/gyms" element={<Venues />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/leaderboard/:id" element={<Leaderboard />} />
          {/* /plan was the language-model plan generator. It is replaced by the
              rule-based meal plan, which explains every choice. Old links and
              cached bundles land on the thing that superseded it. */}
          <Route path="/plan" element={<Navigate to="/meals" replace />} />
          <Route path="/music" element={<MusicGallery />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/programs-done" element={<ProgramsDone />} />
          <Route path="/people" element={<People />} />
          <Route path="/u/:id" element={<UserProfile />} />
          <Route path="/chat" element={<ChatList />} />
          <Route path="/chat/:id" element={<ChatRoom />} />
          <Route path="/buddies" element={<Buddies />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/store" element={<Store />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/events" element={<Events />} />
          <Route path="/leagues" element={<Leagues />} />
          <Route path="/support" element={<Support />} />
          <Route path="/my-plan" element={<Assessment />} />
          <Route path="/partner/:id" element={<PartnerPage />} />
          <Route path="/help" element={<Help />} />
          <Route path="/challenge/:id" element={<ChallengeRoom />} />
          <Route path="/coaches-community" element={<CoachesDirectory />} />
          <Route path="/coach-profile" element={<CoachProfileEdit />} />
          <Route path="/coach-dashboard" element={<CoachDashboard />} />
          <Route path="/coach-program/:id" element={<CoachProgramDetail />} />
          <Route path="/group" element={<GroupSessions />} />
          <Route path="/group/:id" element={<GroupSessionDetail />} />
          {/* /setup retired — the coaching intake at /my-plan asks everything it did
              and more, and computes real calorie targets instead of flat per-goal
              numbers. Old links land on Home via the catch-all. */}
        </Route>

        <Route
          element={
            <RequireAdmin>
              <PlainOutlet />
            </RequireAdmin>
          }
        >
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/upload" element={<AdminUpload />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/reels" element={<AdminReels />} />
          <Route path="/admin/leads" element={<AdminLeads />} />
          <Route path="/admin/video-import" element={<AdminVideoImport />} />
          <Route path="/admin/support" element={<AdminSupport />} />
          <Route path="/admin/:resource" element={<AdminResource />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </motion.div>
      {TAB_ROUTES.includes(location.pathname) && <TabBar />}
      <InstallPrompt />
      <DesktopGate />
      <CelebrationListener />
      </div>
    </>
  );
}

/** App-wide level-up celebration (confetti + toast) driven by the socket. */
function CelebrationListener() {
  const [levelUp, setLevelUp] = useState<number | null>(null);
  useEffect(() => {
    const socket = getSocket();
    const onLevel = (d: { level: number }) => {
      setLevelUp(d.level);
      celebrateFeedback(); // haptic + fanfare on level-up
    };
    socket.on('levelup', onLevel);
    return () => {
      socket.off('levelup', onLevel);
    };
  }, []);
  if (levelUp === null) return null;
  return (
    <>
      <Confetti onDone={() => setLevelUp(null)} />
      <div className="fixed inset-x-0 top-24 z-[70] mx-auto flex max-w-[480px] justify-center px-4">
        <div className="animate-pop rounded-2xl bg-white px-8 py-5 text-center shadow-xl">
          <p className="text-4xl">🎉</p>
          <p className="mt-1 text-lg font-extrabold text-brand-pink">Level {levelUp}!</p>
          <p className="text-xs text-gray-400">You leveled up — keep the streak alive</p>
        </div>
      </div>
    </>
  );
}

// Detail pages render full-screen without the bottom tab bar.
import { Outlet } from 'react-router-dom';
function PlainOutlet() {
  return <Outlet />;
}

/** Motivational branded surround shown around the phone frame on desktop. */
function DesktopBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden select-none items-center justify-between px-[7vw] text-white lg:flex">
      <div className="max-w-sm">
        <div className="text-6xl font-extrabold italic tracking-tight text-white/90">PULSE</div>
        <p className="mt-4 text-xl font-medium text-white/50">
          Train. Eat. Recover. Repeat.
        </p>
        <div className="mt-10 space-y-3 text-white/40">
          <p className="flex items-center gap-3"><span className="text-2xl">💪</span> Coach-led workouts & yoga</p>
          <p className="flex items-center gap-3"><span className="text-2xl">🥗</span> Healthy recipes & nutrition</p>
          <p className="flex items-center gap-3"><span className="text-2xl">🔥</span> Streaks, challenges & community</p>
        </div>
      </div>
      <div className="text-right">
        <p className="animate-float text-[9rem] font-black leading-[0.85] tracking-tighter text-white/[0.06]">
          NO<br />DAYS<br />OFF
        </p>
      </div>
    </div>
  );
}
