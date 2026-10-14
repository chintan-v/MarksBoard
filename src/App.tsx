import { useState, useEffect, useRef } from 'react';
import type { Semester, StudentProfile } from './types';
import {
  loadStudentProfile,
  saveStudentProfileAsync,
  findStudentProfileAsync,
  getOrCreateGuestProfile,
  setActiveUSN,
  getActiveUSN,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { SemesterCardsView } from './components/SemesterCardsView';
import { SemesterDetail } from './components/SemesterDetail';
import { ProfileModal } from './components/ProfileModal';
import { AuthModal } from './components/AuthModal';
import { GradingScaleModal } from './components/GradingScaleModal';
import { GradeCardReportModal } from './components/GradeCardReportModal';
import { SemesterPredictorModal } from './components/SemesterPredictorModal';
import { ToastContainer } from './components/Toast';
import type { ToastMessage } from './components/Toast';

export function App() {
  const [profile, setProfile] = useState<StudentProfile>(() => loadStudentProfile());
  const [viewMode, setViewMode] = useState<'overview' | 'semester'>('overview');
  const [activeSemNum, setActiveSemNum] = useState<number>(profile.currentSemester || 5);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'guest'>(
    profile.isGuest ? 'guest' : 'synced'
  );

  const isInitialMount = useRef(true);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (type: 'success' | 'error' | 'info', message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPromptReason, setAuthPromptReason] = useState<string | null>(null);
  const [isGradingScaleOpen, setIsGradingScaleOpen] = useState(false);
  const [isGradeCardOpen, setIsGradeCardOpen] = useState(false);
  const [simulateSemNumber, setSimulateSemNumber] = useState<number | null>(null);

  // 1. On Mount: If already logged in on this device, pull down latest cloud data from Supabase
  useEffect(() => {
    const activeUsn = getActiveUSN();
    if (activeUsn && activeUsn !== 'GUEST' && !profile.isGuest) {
      setSyncStatus('syncing');
      findStudentProfileAsync(activeUsn)
        .then((cloudProfile) => {
          if (cloudProfile) {
            setProfile(cloudProfile);
            setSyncStatus('synced');
          } else {
            setSyncStatus('synced');
          }
        })
        .catch((err) => {
          console.warn('Initial cloud sync could not reach Supabase, using local cache:', err);
          setSyncStatus('offline');
        });
    } else {
      setSyncStatus('guest');
    }
  }, []);

  // 2. Debounced Cloud Save: Automatically sync changes to Supabase without racing keystrokes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (profile.isGuest || profile.usn === 'GUEST') {
      setSyncStatus('guest');
      return;
    }

    setSyncStatus('syncing');
    const timer = setTimeout(async () => {
      try {
        await saveStudentProfileAsync(profile);
        setSyncStatus('synced');
      } catch (err) {
        console.error('Cloud auto-sync failed:', err);
        setSyncStatus('offline');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [profile]);

  const handleManualSync = async () => {
    if (profile.isGuest) {
      handleRequireAuth('sync account to cloud database');
      return;
    }
    setSyncStatus('syncing');
    try {
      const cloud = await findStudentProfileAsync(profile.usn);
      if (cloud) {
        setProfile(cloud);
        setSyncStatus('synced');
        showToast('success', 'Latest semester marks & data synced from Supabase Cloud!', 'Cloud Synced');
      } else {
        await saveStudentProfileAsync(profile);
        setSyncStatus('synced');
        showToast('success', 'Current semester marks uploaded to Supabase Cloud!', 'Cloud Synced');
      }
    } catch (err: any) {
      console.error('Manual sync error', err);
      setSyncStatus('offline');
      showToast('error', err?.message || 'Could not connect to Supabase Cloud.', 'Sync Failed');
    }
  };

  const handleRequireAuth = (reason: string = 'modify marks or customize your account') => {
    setAuthPromptReason(reason);
    setIsAuthModalOpen(true);
  };

  const activeSemester = profile.semesters.find((s) => s.semNumber === activeSemNum) || profile.semesters[0];

  const handleUpdateSemester = (updatedSemester: Semester) => {
    if (profile.isGuest) {
      handleRequireAuth('save changes to semester marks or subjects');
      return;
    }
    const updatedSemesters = profile.semesters.map((s) =>
      s.semNumber === updatedSemester.semNumber ? updatedSemester : s
    );
    setProfile({
      ...profile,
      semesters: updatedSemesters,
    });
  };

  const handleSelectSemester = (semNum: number) => {
    setActiveSemNum(semNum);
    setViewMode('semester');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSimulateSemester = (semNum: number) => {
    setSimulateSemNumber(semNum);
  };

  const handleLoginSuccess = (newProfile: StudentProfile) => {
    setProfile(newProfile);
    setActiveSemNum(newProfile.currentSemester || 5);
    setViewMode('overview');
    setAuthPromptReason(null);
    setSyncStatus(newProfile.isGuest ? 'guest' : 'synced');
  };

  const handleLogout = () => {
    const guest = getOrCreateGuestProfile();
    setActiveUSN('GUEST');
    setProfile(guest);
    setActiveSemNum(guest.currentSemester || 5);
    setViewMode('overview');
    setAuthPromptReason(null);
    setSyncStatus('guest');
    setIsAuthModalOpen(true);
  };

  const simulateSemesterObj = simulateSemNumber
    ? profile.semesters.find((s) => s.semNumber === simulateSemNumber)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-fuchsia-500 selection:text-white">
      {/* Background Neon Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] animate-pulse-glow" />
        <div className="absolute top-3/4 right-1/4 translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Guest Mode Notification Bar */}
      {profile.isGuest && (
        <div className="bg-gradient-to-r from-purple-950/60 via-amber-950/40 to-slate-950/80 border-b border-amber-500/20 px-4 sm:px-8 lg:px-12 xl:px-14 py-2 text-xs flex flex-wrap items-center justify-between gap-2.5 text-amber-200 relative z-30 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>
              Previewing as <strong className="text-white font-mono">{profile.name}</strong> ({profile.usn}) • Demo Account
            </span>
            <span className="text-slate-400 hidden md:inline">
              — Sample marks loaded for Semesters 1–6 (Year 4 is empty). Changes require an account.
            </span>
          </div>
          <button
            onClick={() => handleRequireAuth('create your personalized student ID')}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] transition-colors shrink-0 shadow-sm"
          >
            Sign In / Create Student ID
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        profile={profile}
        activeSemesterNum={activeSemNum}
        isOverviewActive={viewMode === 'overview'}
        onSelectOverview={() => setViewMode('overview')}
        onSelectSemester={handleSelectSemester}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenAuth={() => {
          setAuthPromptReason(null);
          setIsAuthModalOpen(true);
        }}
        onOpenGradingScale={() => setIsGradingScaleOpen(true)}
        onOpenGradeCard={() => setIsGradeCardOpen(true)}
        syncStatus={syncStatus}
        onManualSync={handleManualSync}
      />

      {/* Main App Container - Utilizing Full Screen */}
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 xl:px-14 py-6 relative z-10">
        {viewMode === 'overview' ? (
          <SemesterCardsView
            profile={profile}
            onSelectSemester={handleSelectSemester}
            onSimulateSemester={handleSimulateSemester}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onRequireAuth={handleRequireAuth}
            onUpdateSemester={handleUpdateSemester}
          />
        ) : (
          <SemesterDetail
            profile={profile}
            semester={activeSemester}
            onUpdateSemester={handleUpdateSemester}
            onBackToOverview={() => setViewMode('overview')}
            onSelectSemester={(sem) => setActiveSemNum(sem)}
            allSemesters={profile.semesters}
            onRequireAuth={handleRequireAuth}
          />
        )}
      </main>

      {/* Footer - Full Screen */}
      <footer className="mt-auto border-t border-white/10 bg-slate-950/80 backdrop-blur-md py-8 text-xs text-slate-500 relative z-10">
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-14 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="font-heading font-bold text-slate-300 text-sm">MarksBoard</span>
            <span>— Engineering SGPA, MSE/CIA/SEE & Module Revision Suite</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsGradingScaleOpen(true)}
              className="hover:text-purple-400 transition-colors"
            >
              DSU 10-Point Scale
            </button>
            <span>•</span>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="hover:text-cyan-400 transition-colors"
            >
              Profile & Bio
            </button>
            <span>•</span>
            <button
              onClick={() => setIsGradeCardOpen(true)}
              className="hover:text-fuchsia-400 transition-colors"
            >
              Print Transcript
            </button>
          </div>

          <div className="text-right text-[11px] text-slate-500 font-mono">
            {profile.college} • {profile.branch}
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onUpdateProfile={(updated) => setProfile(updated)}
        onLogout={handleLogout}
        onRequireAuth={handleRequireAuth}
        onShowToast={showToast}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthPromptReason(null);
        }}
        onLoginSuccess={handleLoginSuccess}
        promptReason={authPromptReason}
        onShowToast={showToast}
      />

      <GradingScaleModal
        isOpen={isGradingScaleOpen}
        onClose={() => setIsGradingScaleOpen(false)}
        collegeName={profile.college}
      />

      <GradeCardReportModal
        isOpen={isGradeCardOpen}
        onClose={() => setIsGradeCardOpen(false)}
        profile={profile}
        activeSemester={activeSemester}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {simulateSemesterObj && (
        <SemesterPredictorModal
          isOpen={true}
          onClose={() => setSimulateSemNumber(null)}
          semNumber={simulateSemesterObj.semNumber}
          subjects={simulateSemesterObj.subjects}
          onApplyExpectedMarks={(updatedSubjects) => {
            if (profile.isGuest) {
              handleRequireAuth('save simulated marks to your semester scorecard');
              return;
            }
            handleUpdateSemester({
              ...simulateSemesterObj,
              subjects: updatedSubjects,
            });
            setSimulateSemNumber(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
