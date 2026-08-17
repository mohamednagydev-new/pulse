import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuth } from './store/auth';
import TabBar from './components/TabBar';
import Confetti from './components/Confetti';
import Toaster from './components/Toaster';
import FeatureToast from './components/FeatureToast';
import DesktopGate from './components/DesktopGate';
import InstallPrompt from './components/InstallPrompt';
import InstallFab from './components/InstallFab';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import PullToRefresh from './components/PullToRefresh';
import { getSocket } from './lib/socket';
import { celebrateFeedback } from './lib/haptics';
import { pulseChime } from './lib/chime';
import { track } from './lib/track';

const TAB_ROUTES = ['/', '/programs', '/community', '/wellness', '/profile'];
import AppLayout from './components/AppLayout';
import Splash from './components/Splash';

// Eager: the auth funnel and the five tab screens — the first paint for
// everyone. Everything else code-splits so the initial bundle stops shipping
// all 68 pages to a phone that wanted the login screen.
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import GuestContact from './pages/GuestContact';
import Landing from './pages/Landing';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import ProgramsHome from './pages/programs/ProgramsHome';
import WellnessHome from './pages/wellness/WellnessHome';
import Profile from './pages/Profile';
import Community from './pages/social/Community';

/** lazy() that survives redeploys. A client whose open app requests a chunk
 *  from a previous build gets a broken module ("reading 'default'" crashes at
 *  the route boundary — seen live on /lesson and /exercises). One transparent
 *  reload picks up the new build; the sessionStorage guard prevents loops, and
 *  clears on any successful load so the NEXT deploy can heal too. */
function lazyRoute<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() =>
    load()
      .then((m) => {
        if (!m || !m.default) throw new Error('empty chunk');
        sessionStorage.removeItem('pulse_chunk_reload');
        return m;
      })
      .catch(async (e) => {
        const stage = Number(sessionStorage.getItem('pulse_chunk_reload') ?? 0);
        if (stage === 0) {
          sessionStorage.setItem('pulse_chunk_reload', '1');
          // Update the SW and WAIT for the new worker to activate (autoUpdate
          // SWs skipWaiting) — reloading before activation re-served the same
          // stale index.html and burned the retry ("empty chunk" reports).
          try {
            const reg = await navigator.serviceWorker?.getRegistration();
            if (reg) {
              await reg.update();
              const fresh = reg.installing ?? reg.waiting;
              if (fresh) {
                await new Promise<void>((resolve) => {
                  const t = setTimeout(resolve, 4000); // never hang the recovery
                  fresh.addEventListener('statechange', () => {
                    if (fresh.state === 'activated') { clearTimeout(t); resolve(); }
                  });
                });
              }
            }
          } catch {
            /* no SW (dev) — plain reload is still right */
          }
          window.location.reload();
          return new Promise<{ default: T }>(() => {}); // page is reloading — never settles
        }
        if (stage === 1) {
          // The polite path failed — go nuclear: drop every SW and cache so the
          // next load is guaranteed to come from the network.
          sessionStorage.setItem('pulse_chunk_reload', '2');
          try {
            const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
            await Promise.all(regs.map((r) => r.unregister()));
            const keys = (await caches?.keys()) ?? [];
            await Promise.all(keys.map((k) => caches.delete(k)));
          } catch {
            /* even partial cleanup helps */
          }
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
        throw e; // third failure: a real problem, let the boundary report it
      }),
  );
}

const WorkoutHub = lazyRoute(() => import('./pages/programs/WorkoutHub'));
const YogaHub = lazyRoute(() => import('./pages/programs/YogaHub'));
const Schedule = lazyRoute(() => import('./pages/programs/Schedule'));
const WorkoutSession = lazyRoute(() => import('./pages/programs/WorkoutSession'));
const CoachPage = lazyRoute(() => import('./pages/programs/CoachPage'));
const ProgramPage = lazyRoute(() => import('./pages/programs/ProgramPage'));
const LessonPage = lazyRoute(() => import('./pages/programs/LessonPage'));
const ExercisesPage = lazyRoute(() => import('./pages/programs/ExercisesPage'));
const MuscleGroupPage = lazyRoute(() => import('./pages/programs/MuscleGroupPage'));
const WellnessSection = lazyRoute(() => import('./pages/wellness/WellnessSection'));
const CategoryPage = lazyRoute(() => import('./pages/wellness/CategoryPage'));
const RecipePage = lazyRoute(() => import('./pages/wellness/RecipePage'));
const ArticlePage = lazyRoute(() => import('./pages/wellness/ArticlePage'));
const Info = lazyRoute(() => import('./pages/Info'));
const SearchPage = lazyRoute(() => import('./pages/SearchPage'));
const Bookmarks = lazyRoute(() => import('./pages/Bookmarks'));
const ProgramsDone = lazyRoute(() => import('./pages/ProgramsDone'));
const Buddies = lazyRoute(() => import('./pages/social/Buddies'));
const Reels = lazyRoute(() => import('./pages/Reels'));
const Notifications = lazyRoute(() => import('./pages/Notifications'));
const Store = lazyRoute(() => import('./pages/Store'));
const Deals = lazyRoute(() => import('./pages/Deals'));
const Events = lazyRoute(() => import('./pages/Events'));
const Features = lazyRoute(() => import('./pages/Features'));
const DietPrograms = lazyRoute(() => import('./pages/DietPrograms'));
const Champions = lazyRoute(() => import('./pages/Champions'));
const PartnerHub = lazyRoute(() => import('./pages/PartnerHub'));
const Leagues = lazyRoute(() => import('./pages/Leagues'));
const PartnerPage = lazyRoute(() => import('./pages/PartnerPage'));
const Help = lazyRoute(() => import('./pages/Help'));
const Tracker = lazyRoute(() => import('./pages/Tracker'));
const MealPlan = lazyRoute(() => import('./pages/MealPlan'));
const Venues = lazyRoute(() => import('./pages/Venues'));
const Progress = lazyRoute(() => import('./pages/Progress'));
const Achievements = lazyRoute(() => import('./pages/Achievements'));
const MusicGallery = lazyRoute(() => import('./pages/MusicGallery'));
const AdminHome = lazyRoute(() => import('./pages/admin/AdminHome'));
const AdminResource = lazyRoute(() => import('./pages/admin/AdminResource'));
const AdminUpload = lazyRoute(() => import('./pages/admin/AdminUpload'));
const AdminUsers = lazyRoute(() => import('./pages/admin/AdminUsers'));
const AdminAnalytics = lazyRoute(() => import('./pages/admin/AdminAnalytics'));
const AdminReels = lazyRoute(() => import('./pages/admin/AdminReels'));
const AdminLeads = lazyRoute(() => import('./pages/admin/AdminLeads'));
const AdminVideoImport = lazyRoute(() => import('./pages/admin/AdminVideoImport'));
const AdminSupport = lazyRoute(() => import('./pages/admin/AdminSupport'));
const AdminPosts = lazyRoute(() => import('./pages/admin/AdminPosts'));
const AdminModeration = lazyRoute(() => import('./pages/admin/AdminModeration'));
const AdminEmail = lazyRoute(() => import('./pages/admin/AdminEmail'));
const AdminChallengeAudit = lazyRoute(() => import('./pages/admin/AdminChallengeAudit'));
const CoachChat = lazyRoute(() => import('./pages/CoachChat'));
const Support = lazyRoute(() => import('./pages/Support'));
const Assessment = lazyRoute(() => import('./pages/Assessment'));
const People = lazyRoute(() => import('./pages/social/People'));
const UserProfile = lazyRoute(() => import('./pages/social/UserProfile'));
const ChatList = lazyRoute(() => import('./pages/social/ChatList'));
const ChatRoom = lazyRoute(() => import('./pages/social/ChatRoom'));
const ChallengeRoom = lazyRoute(() => import('./pages/social/ChallengeRoom'));
const CoachesDirectory = lazyRoute(() => import('./pages/social/CoachesDirectory'));
const CoachProfileEdit = lazyRoute(() => import('./pages/social/CoachProfileEdit'));
const CoachDashboard = lazyRoute(() => import('./pages/social/CoachDashboard'));
const CoachProgramDetail = lazyRoute(() => import('./pages/social/CoachProgramDetail'));
const GroupSessions = lazyRoute(() => import('./pages/social/GroupSessions'));
const GroupSessionDetail = lazyRoute(() => import('./pages/social/GroupSessionDetail'));
const WeekZero = lazyRoute(() => import('./pages/WeekZero'));
const Routines = lazyRoute(() => import('./pages/Routines'));
const InvitePage = lazyRoute(() => import('./pages/InvitePage'));
const TvBoard = lazyRoute(() => import('./pages/TvBoard'));
const PartnerBenefits = lazyRoute(() => import('./pages/PartnerBenefits'));
const CoachClientDetail = lazyRoute(() => import('./pages/social/CoachClientDetail'));
const MyInvite = lazyRoute(() => import('./pages/MyInvite'));

function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
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
  // Root always pitches: any signed-out visit to pulse.geddo.online lands on
  // the landing page (signed-in users never reach this — they render Home).
  // Deep links to specific screens go to login instead, so a shared /recipe or
  // /challenge link still lands where it pointed after signing in.
  const seenIntro = localStorage.getItem('fitit_onboarded');
  const target = location.pathname === '/' ? '/welcome' : seenIntro ? '/login' : '/welcome';
  return <Navigate to={target} replace state={{ from: location }} />;
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

  // The API layer fires this when a 401 survives the refresh attempt: the
  // session is dead, so reset to guest — RequireAuth then routes to /login
  // (carrying state.from) instead of leaving a screen of failed queries.
  useEffect(() => {
    const onExpired = () => {
      if (useAuth.getState().status === 'authed') {
        useAuth.setState({ user: null, status: 'guest' });
      }
    };
    window.addEventListener('pulse:session-expired', onExpired);
    return () => window.removeEventListener('pulse:session-expired', onExpired);
  }, []);

  // Pending coach/gym invite: InvitePage saves the code before sending the
  // visitor to register/login. The email path returns to the invite URL by
  // itself, but Google OAuth lands on '/' — without this, the invite silently
  // never redeems. InvitePage clears the stored code after redeeming.
  const navigate = useNavigate();
  useEffect(() => {
    if (status !== 'authed') return;
    try {
      const raw = localStorage.getItem('pulse-pending-invite');
      if (!raw) return;
      const { code, gym } = JSON.parse(raw);
      if (code && !location.pathname.startsWith('/invite/')) {
        navigate(`/invite/${gym ? 'g/' : ''}${code}`, { replace: true });
      }
    } catch {
      /* corrupted entry — drop it so it can't loop */
      localStorage.removeItem('pulse-pending-invite');
    }
  }, [status]);

  // Scroll handling + screen-view analytics. Forward navigations start at the
  // top; Back (POP) restores where you were — returning from a recipe to a
  // scrolled list used to dump you at the top of the feed.
  const navType = useNavigationType();
  const scrollPositions = useRef(new Map<string, number>());
  const prevLocationKey = useRef(location.key);
  useEffect(() => {
    scrollPositions.current.set(prevLocationKey.current, window.scrollY);
    prevLocationKey.current = location.key;
    if (navType === 'POP') {
      const y = scrollPositions.current.get(location.key) ?? 0;
      // rAF: let the (usually query-cached) content lay out first.
      requestAnimationFrame(() => window.scrollTo(0, y));
    } else {
      window.scrollTo(0, 0);
    }
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
      <FeatureToast />
      <OfflineBanner />
      <PullToRefresh />
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
      <ErrorBoundary>
      <Suspense fallback={<Splash />}>
      <Routes location={location}>
        <Route path="/welcome" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/contact" element={<GuestContact />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/community" element={<Community />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Content tabs guests may browse: authed users keep the tab layout,
            guests get the page + a persistent signup bar. Browsing first and
            committing second — the same principle as dropping the intake gate. */}
        <Route element={<TabOrGuest />}>
          <Route path="/programs" element={<ProgramsHome />} />
          <Route path="/wellness" element={<WellnessHome />} />
        </Route>

        {/* Content depth open to guests (the APIs behind these are public). */}
        <Route element={<GuestBrowse />}>
          <Route path="/programs/coach/:id" element={<CoachPage />} />
          <Route path="/programs/:id" element={<ProgramPage />} />
          <Route path="/lesson/:id" element={<LessonPage />} />
          <Route path="/exercises" element={<ExercisesPage />} />
          <Route path="/exercises/:groupId" element={<MuscleGroupPage />} />
          <Route path="/wellness/:kind" element={<WellnessSection />} />
          <Route path="/category/:id" element={<CategoryPage />} />
          <Route path="/recipe/:id" element={<RecipePage />} />
          <Route path="/article/:id" element={<ArticlePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/gyms" element={<Venues />} />
          <Route path="/help" element={<Help />} />
          {/* Invite landings must work signed-out: the whole point is that a
              coach's or gym's link is a stranger's first touch with the app. */}
          <Route path="/invite/g/:code" element={<InvitePage />} />
          <Route path="/invite/:code" element={<InvitePage />} />
          {/* The partner pitch — coaches, gyms, stores, sponsors, events. */}
          <Route path="/why-partner" element={<PartnerBenefits />} />
        </Route>

        {/* Fully public, no shell: runs on a gym's TV screen. */}
        <Route path="/tv/:id" element={<TvBoard />} />

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
          <Route path="/session/r/:routineId" element={<WorkoutSession />} />
          <Route path="/info" element={<Info />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/meals" element={<MealPlan />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/achievements" element={<Achievements />} />
          {/* /leaderboard/:id removed — nothing ever linked to it; the weekly
              board lives in Achievements and each challenge room has its own. */}
          {/* /plan was the language-model plan generator. It is replaced by the
              rule-based meal plan, which explains every choice. Old links and
              cached bundles land on the thing that superseded it. */}
          <Route path="/plan" element={<Navigate to="/meals" replace />} />
          <Route path="/music" element={<MusicGallery />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/programs-done" element={<ProgramsDone />} />
          <Route path="/people" element={<People />} />
          <Route path="/u/:id" element={<UserProfile />} />
          <Route path="/chat" element={<ChatList />} />
          <Route path="/chat/:id" element={<ChatRoom />} />
          {/* NOT admin-gated — this sat inside RequireAdmin for a day and every
              normal user tapping "AI Coach" was silently bounced to Home. */}
          <Route path="/coach-chat" element={<CoachChat />} />
          <Route path="/nutritionist" element={<CoachChat />} />
          <Route path="/buddies" element={<Buddies />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/store" element={<Store />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/events" element={<Events />} />
          <Route path="/features" element={<Features />} />
          <Route path="/diet-programs" element={<DietPrograms />} />
          <Route path="/champions" element={<Champions />} />
          <Route path="/partner-hub" element={<PartnerHub />} />
          <Route path="/leagues" element={<Leagues />} />
          <Route path="/support" element={<Support />} />
          <Route path="/my-plan" element={<Assessment />} />
          <Route path="/partner/:id" element={<PartnerPage />} />
          <Route path="/challenge/:id" element={<ChallengeRoom />} />
          <Route path="/coaches-community" element={<CoachesDirectory />} />
          <Route path="/coach-profile" element={<CoachProfileEdit />} />
          <Route path="/coach-dashboard" element={<CoachDashboard />} />
          <Route path="/coach-program/:id" element={<CoachProgramDetail />} />
          <Route path="/group" element={<GroupSessions />} />
          <Route path="/group/:id" element={<GroupSessionDetail />} />
          <Route path="/week-zero" element={<WeekZero />} />
          <Route path="/routines" element={<Routines />} />
          <Route path="/coach-client/:id" element={<CoachClientDetail />} />
          <Route path="/my-invite" element={<MyInvite />} />
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
          <Route path="/admin/posts" element={<AdminPosts />} />
          <Route path="/admin/moderation" element={<AdminModeration />} />
          <Route path="/admin/email" element={<AdminEmail />} />
          <Route path="/admin/challenge-audit" element={<AdminChallengeAudit />} />
          <Route path="/admin/:resource" element={<AdminResource />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
      </motion.div>
      {TAB_ROUTES.includes(location.pathname) && (
        <>
          <TabBar />
          {/* Persistent until installed — the banner snoozes, this doesn't. */}
          <InstallFab />
        </>
      )}
      <InstallPrompt />
      <DesktopGate />
      <CelebrationListener />
      </div>
    </>
  );
}

/** App-wide level-up celebration (confetti + toast) driven by the socket. */
function CelebrationListener() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [levelUp, setLevelUp] = useState<number | null>(null);
  useEffect(() => {
    const socket = getSocket();
    const onLevel = (d: { level: number }) => {
      setLevelUp(d.level);
      celebrateFeedback(); // haptic + fanfare on level-up
    };
    // Server-side events (buddy accepted, cheer, DM…) refresh the bell badge and
    // lists instantly while the app is open — no more waiting for the 60s poll.
    // Each arrival plays the PULSE heartbeat chime: the app's sound identity.
    const onNotify = () => {
      pulseChime();
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    };
    const onInbox = () => {
      pulseChime(0.7);
      qc.invalidateQueries({ queryKey: ['chat-unread'] });
    };
    socket.on('levelup', onLevel);
    socket.on('notify', onNotify);
    socket.on('dm:inbox', onInbox);
    return () => {
      socket.off('levelup', onLevel);
      socket.off('notify', onNotify);
      socket.off('dm:inbox', onInbox);
    };
  }, [qc]);
  if (levelUp === null) return null;
  return (
    <>
      <Confetti onDone={() => setLevelUp(null)} />
      <div className="fixed inset-x-0 top-24 z-[70] mx-auto flex max-w-[480px] justify-center px-4">
        <div className="animate-pop rounded-2xl bg-white px-8 py-5 text-center shadow-xl">
          <p className="text-4xl">🎉</p>
          <p className="mt-1 text-lg font-extrabold text-brand-pink">{t('fun.levelUpTitle', { n: levelUp })}</p>
          <p className="text-xs text-gray-400">{t('fun.levelUpSub')}</p>
        </div>
      </div>
    </>
  );
}

// Detail pages render full-screen without the bottom tab bar.
import { Outlet } from 'react-router-dom';
import GuestBar from './components/GuestBar';
function PlainOutlet() {
  return <Outlet />;
}

/** Guest-browsable content page: authed renders plainly; guests get the page
 *  plus the persistent signup bar (and bottom space so it hides nothing). */
function GuestBrowse() {
  const status = useAuth((s) => s.status);
  if (status === 'loading' || status === 'idle') return <Splash />;
  if (status === 'authed') return <Outlet />;
  return (
    <>
      <Outlet />
      <div className="h-20" aria-hidden />
      <GuestBar />
    </>
  );
}

/** Content TAB guests may browse: authed users keep the tab-bar layout. */
function TabOrGuest() {
  const status = useAuth((s) => s.status);
  if (status === 'loading' || status === 'idle') return <Splash />;
  if (status === 'authed') return <AppLayout />;
  return (
    <>
      <Outlet />
      <div className="h-20" aria-hidden />
      <GuestBar />
    </>
  );
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
