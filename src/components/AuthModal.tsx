import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Lock,
  Sparkles,
  ArrowRight,
  UserCheck,
  AlertTriangle,
  UserPlus,
  Eye,
  EyeOff,
  Trash2,
  AlertCircle,
  Users,
  Database,
  Loader2,
} from 'lucide-react';
import type { StudentProfile } from '../types';
import { ENGINEERING_BRANCHES } from '../types';
import {
  createEmptySemesters,
  getAvailableAccounts,
  getAvailableAccountsAsync,
  findStudentProfileAsync,
  saveStudentProfileAsync,
  getOrCreateGuestProfile,
  deleteSavedAccountAsync,
  getActiveUSN,
} from '../utils/storage';
import { isSupabaseConfigured } from '../utils/supabaseClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: StudentProfile) => void;
  promptReason?: string | null;
  onContinueAsGuest?: () => void;
  onOpenAdminDirectory?: () => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  promptReason,
  onContinueAsGuest,
  onOpenAdminDirectory,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>(promptReason ? 'register' : 'login');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Independent Login Fields (never bleed into registration)
  const [loginUsn, setLoginUsn] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Independent Registration Fields
  const [regName, setRegName] = useState('');
  const [regUsn, setRegUsn] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regCollege, setRegCollege] = useState('Dayananda Sagar University');
  const [regBranch, setRegBranch] = useState(ENGINEERING_BRANCHES[0].name);
  const [regSemester, setRegSemester] = useState<number>(5);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Error notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [errorPopup, setErrorPopup] = useState<{
    title: string;
    message: string;
    suggestCreateAccount?: boolean;
    attemptedUsn?: string;
  } | null>(null);

  // Saved accounts state for dynamic updates when deleting
  const [savedAccounts, setSavedAccounts] = useState(() => getAvailableAccounts());

  const resetAllFields = () => {
    setLoginUsn('');
    setLoginPassword('');
    setShowLoginPassword(false);
    setRegName('');
    setRegUsn('');
    setRegPassword('');
    setRegConfirmPassword('');
    setShowRegisterPassword(false);
    setShowConfirmPassword(false);
    setErrorMsg('');
    setErrorPopup(null);
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // Load local accounts immediately, then fetch cloud accounts
      setSavedAccounts(getAvailableAccounts());
      getAvailableAccountsAsync().then((accs) => {
        if (accs && accs.length > 0) {
          setSavedAccounts(accs);
        }
      });
      setErrorMsg('');
      setErrorPopup(null);
      if (promptReason) {
        setTab('register');
      }
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    } else {
      resetAllFields();
    }
  }, [isOpen, promptReason]);

  if (!isOpen) return null;

  const handleModalClose = () => {
    resetAllFields();
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorPopup(null);

    const cleanUSN = loginUsn.trim().toUpperCase();

    if (!cleanUSN) {
      setErrorMsg('Please enter your University Seat Number (USN).');
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Look up account from Supabase Cloud first, then fallback to local
      const profile = await findStudentProfileAsync(cleanUSN);

      if (!profile) {
        const msg = `Invalid USN! No registered account found for "${cleanUSN}".`;
        setErrorMsg(msg);
        setErrorPopup({
          title: 'Student Account Not Found',
          message: `We could not find an account with USN "${cleanUSN}". Please verify your USN or create a new student account to start tracking.`,
          suggestCreateAccount: true,
          attemptedUsn: cleanUSN,
        });
        return;
      }

      if (profile.password && profile.password !== loginPassword) {
        const msg = `Incorrect Password for USN "${cleanUSN}".`;
        setErrorMsg(msg);
        setErrorPopup({
          title: 'Authentication Failed',
          message: `The password entered does not match student account "${cleanUSN}". Please double-check and try again.`,
          suggestCreateAccount: false,
        });
        return;
      }

      // Authentication succeeded!
      onLoginSuccess(profile);
      handleModalClose();
    } catch (err) {
      console.error('Login error', err);
      setErrorMsg('An unexpected error occurred while logging in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (targetUSN: string) => {
    setIsSubmitting(true);
    try {
      const profile = await findStudentProfileAsync(targetUSN);
      if (profile) {
        onLoginSuccess(profile);
        handleModalClose();
      } else {
        setErrorMsg(`Account ${targetUSN} could not be loaded.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (targetUSN: string, accountName: string) => {
    if (window.confirm(`Remove saved account for ${accountName} (${targetUSN})?`)) {
      await deleteSavedAccountAsync(targetUSN);
      const updated = await getAvailableAccountsAsync();
      setSavedAccounts(updated);
      if (getActiveUSN() === 'GUEST') {
        const guest = getOrCreateGuestProfile();
        onLoginSuccess(guest);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorPopup(null);

    if (!regName.trim() || !regUsn.trim()) {
      setErrorMsg('Please enter your Full Name and USN Number.');
      return;
    }

    if (!regPassword.trim()) {
      setErrorMsg('Please create a password for your account.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match! Please check and re-enter your confirm password.');
      return;
    }

    const cleanUSN = regUsn.trim().toUpperCase();

    if (cleanUSN === 'GUEST' || cleanUSN.startsWith('GUEST')) {
      setErrorMsg('University Seat Number (USN) cannot be "GUEST". Please enter your university seat number.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if account already exists in Supabase or local storage
      const existing = await findStudentProfileAsync(cleanUSN);
      if (existing) {
        setErrorMsg(`An account with USN "${cleanUSN}" already exists. Please sign in instead!`);
        return;
      }

      // Real student accounts start clean with 4 starter subjects per semester
      const newProfile: StudentProfile = {
        usn: cleanUSN,
        name: regName.trim(),
        password: regPassword,
        college: regCollege.trim() || 'Dayananda Sagar University',
        branch: regBranch || ENGINEERING_BRANCHES[0].name,
        avatar: '👨‍💻',
        bio: 'Engineering Student 🚀',
        targetCGPA: 9.0,
        currentSemester: regSemester,
        isGuest: false,
        semesters: createEmptySemesters(),
      };

      await saveStudentProfileAsync(newProfile);
      onLoginSuccess(newProfile);
      handleModalClose();
    } catch (err) {
      console.error('Registration error', err);
      setErrorMsg('Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToGuest = () => {
    const guest = getOrCreateGuestProfile();
    onLoginSuccess(guest);
    if (onContinueAsGuest) {
      onContinueAsGuest();
    }
    handleModalClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-fuchsia-500/30 shadow-2xl overflow-hidden bg-slate-900/95 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-fuchsia-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-heading text-white">
                Student Account Access
              </h3>
              <p className="text-xs text-slate-400">
                Log in or create your student ID to save marks
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Account Prompt Warning (if intercepted action) */}
        {promptReason && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Demo Account is Read-Only</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              To <strong className="text-amber-100 font-semibold">{promptReason}</strong>, please sign in with your USN or create a student ID below!
            </p>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 text-xs font-semibold mt-2">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg('');
              setErrorPopup(null);
            }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'border-fuchsia-500 text-fuchsia-300 bg-fuchsia-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Sign In with USN</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg('');
              setErrorPopup(null);
            }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Student ID</span>
          </button>
        </div>

        {/* Prominent Error Popup Banner */}
        {errorPopup && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs space-y-2.5 animate-shake shadow-lg">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-rose-100 mb-1">{errorPopup.title}</h4>
                <p className="text-[11px] text-rose-200/90 leading-relaxed">{errorPopup.message}</p>

                {errorPopup.suggestCreateAccount && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRegUsn(errorPopup.attemptedUsn || '');
                        setTab('register');
                        setErrorPopup(null);
                        setErrorMsg('');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create Account with {errorPopup.attemptedUsn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setErrorPopup(null)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setErrorPopup(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Inline Error Notice */}
        {errorMsg && !errorPopup && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {tab === 'login' ? (
            <>
              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">University Seat Number (USN) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1DS22CS088"
                    value={loginUsn}
                    onChange={(e) => {
                      setLoginUsn(e.target.value);
                      setErrorMsg('');
                      setErrorPopup(null);
                    }}
                    className="w-full uppercase font-mono px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Password *</label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password..."
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setErrorMsg('');
                        setErrorPopup(null);
                      }}
                      className="w-full px-3 py-2.5 pr-10 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-fuchsia-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold transition-all shadow-lg shadow-fuchsia-600/30 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to MarksBoard ⚡</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Saved Accounts on this Device with Remove Option */}
              {savedAccounts.length > 0 && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Saved Accounts on this Device:</span>
                    <span className="text-[10px] text-slate-500">Tap to switch • Trash to remove</span>
                  </div>
                  <div className="space-y-1.5">
                    {savedAccounts.map((acc) => (
                      <div
                        key={acc.usn}
                        className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-between transition-colors group"
                      >
                        {/* Click to login */}
                        <button
                          type="button"
                          onClick={() => handleQuickLogin(acc.usn)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                        >
                          <span className="w-6 h-6 rounded-md flex items-center justify-center text-base shrink-0 overflow-hidden">
                            {acc.avatar?.startsWith('http') ? (
                              <img src={acc.avatar} alt={acc.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{acc.avatar || '👨‍💻'}</span>
                            )}
                          </span>
                          <div className="truncate">
                            <div className="font-semibold text-slate-200 group-hover:text-purple-300 transition-colors truncate">
                              {acc.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 truncate">
                              {acc.usn} • {acc.college}
                            </div>
                          </div>
                        </button>

                        {/* Actions: Remove or Login */}
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAccount(acc.usn, acc.name);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove account from this device"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickLogin(acc.usn)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                            title="Log in"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Continue in Demo Guest Mode */}
              <div className="pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleResetToGuest}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium transition-all text-center flex items-center justify-center gap-2 border border-white/10"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Continue Browsing Demo (Read-Only)</span>
                </button>
              </div>
            </>
          ) : (
            /* Register Form - Clean & Separate from login inputs */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aryan Sharma"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">USN Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1DS22CS088"
                  value={regUsn}
                  onChange={(e) => setRegUsn(e.target.value)}
                  className="w-full uppercase font-mono px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Password with Eye Button */}
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Create Password *</label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    placeholder="Create a password..."
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    title={showRegisterPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegisterPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password with Eye Button */}
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm your password..."
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">College</label>
                  <input
                    type="text"
                    value={regCollege}
                    onChange={(e) => setRegCollege(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Active Sem *</label>
                  <select
                    value={regSemester}
                    onChange={(e) => setRegSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {regSemester > 1 && (
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-[11px] text-cyan-300 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
                  <span>
                    As a Semester {regSemester} student, you'll be prompted to record marks for Semesters 1 to {regSemester - 1} so your cumulative CGPA starts 100% accurate!
                  </span>
                </div>
              )}

              {/* Complete 12 Official Engineering Branches */}
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Engineering Branch</label>
                <select
                  value={regBranch}
                  onChange={(e) => setRegBranch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500 text-xs"
                >
                  {ENGINEERING_BRANCHES.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.id}. {b.name} ({b.shortName})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold transition-all shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Student Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Student ID & Start Tracking 🚀</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Modal Bottom Bar: Database Status & Directory Shortcut */}
        <div className="px-6 py-3.5 bg-black/40 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            {isSupabaseConfigured ? (
              <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Cloud Database Active
              </span>
            ) : (
              <span className="text-amber-400 font-medium inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Device Storage Mode
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {onOpenAdminDirectory && (
              <button
                type="button"
                onClick={() => {
                  handleModalClose();
                  onOpenAdminDirectory();
                }}
                className="hover:text-cyan-400 transition-colors inline-flex items-center gap-1 text-slate-300 font-medium"
              >
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Admin Directory ({savedAccounts.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetToGuest}
              className="hover:text-purple-300 transition-colors text-slate-400"
            >
              Preview Demo Mode
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
