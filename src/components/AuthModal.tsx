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
  Database,
  Loader2,
} from 'lucide-react';
import type { StudentProfile } from '../types';
import { ENGINEERING_BRANCHES } from '../types';
import {
  createEmptySemesters,
  getAvailableAccounts,
  findStudentProfileAsync,
  saveStudentProfileAsync,
  getOrCreateGuestProfile,
  deleteSavedAccount,
  getActiveUSN,
} from '../utils/storage';
import { isSupabaseConfigured } from '../utils/supabaseClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: StudentProfile) => void;
  promptReason?: string | null;
  onContinueAsGuest?: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  promptReason,
  onContinueAsGuest,
  onShowToast,
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
      // Load accounts saved locally on THIS device only (not global cloud list)
      setSavedAccounts(getAvailableAccounts());
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
        onShowToast?.('error', `No registered account found for USN "${cleanUSN}".`, 'Login Failed');
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
        onShowToast?.('error', 'Incorrect password entered. Please try again.', 'Login Failed');
        return;
      }

      // Authentication succeeded!
      onShowToast?.('success', `Welcome back, ${profile.name}!`, 'Logged In Successfully');
      onLoginSuccess(profile);
      handleModalClose();
    } catch (err: any) {
      console.error('Login error', err);
      const msg = err?.message ? `Database Error: ${err.message}` : 'An unexpected error occurred while logging in. Please try again.';
      setErrorMsg(msg);
      onShowToast?.('error', msg, 'Login Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (targetUSN: string) => {
    setIsSubmitting(true);
    try {
      const profile = await findStudentProfileAsync(targetUSN);
      if (profile) {
        onShowToast?.('success', `Logged in as ${profile.name}!`, 'Logged In Successfully');
        onLoginSuccess(profile);
        handleModalClose();
      } else {
        setErrorMsg(`Account ${targetUSN} could not be loaded.`);
        onShowToast?.('error', `Account ${targetUSN} could not be loaded.`, 'Login Failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgetAccountOnDevice = (targetUSN: string, accountName: string) => {
    if (window.confirm(`Forget "${accountName}" (${targetUSN}) from this device's quick login list?\n\n(Your cloud account is safe and not deleted).`)) {
      deleteSavedAccount(targetUSN);
      setSavedAccounts(getAvailableAccounts());
      onShowToast?.('info', `Removed ${targetUSN} from this device's quick login list.`, 'Device Quick List');
      if (getActiveUSN() === targetUSN) {
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
        const msg = `An account with USN "${cleanUSN}" already exists. Please sign in instead!`;
        setErrorMsg(msg);
        onShowToast?.('error', msg, 'Account Already Exists');
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
      onShowToast?.('success', `Welcome, ${newProfile.name}! Student ID registered successfully.`, 'Account Created');
      onLoginSuccess(newProfile);
      handleModalClose();
    } catch (err: any) {
      console.error('Registration error', err);
      const msg = err?.message || 'Failed to create account. Please try again.';
      setErrorMsg(msg);
      onShowToast?.('error', msg, 'Registration Failed');
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel-deep rounded-3xl border border-[#F4EDE0]/20 shadow-2xl overflow-hidden bg-[#14213D]/95 max-h-[92vh] flex flex-col my-auto text-[#F4EDE0]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#F4EDE0]/12 flex items-center justify-between bg-gradient-to-r from-[#14213D] via-[#1a2b4f]/70 to-[#14213D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F4EDE0]/15 border border-[#F4EDE0]/30 flex items-center justify-center text-[#F4EDE0] shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-heading text-[#F4EDE0]">
                Student Account Access
              </h3>
              <p className="text-xs text-[#F4EDE0]/65">
                Log in or create your student ID to save marks
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#F4EDE0]/60 hover:text-[#F4EDE0] hover:bg-[#F4EDE0]/10 transition-colors cursor-pointer"
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
        <div className="flex border-b border-[#F4EDE0]/12 text-xs font-semibold mt-2">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg('');
              setErrorPopup(null);
            }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'login'
                ? 'border-[#F4EDE0] text-[#F4EDE0] bg-[#F4EDE0]/15 font-bold'
                : 'border-transparent text-[#F4EDE0]/60 hover:text-[#F4EDE0]'
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
            className={`flex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'register'
                ? 'border-[#F4EDE0] text-[#F4EDE0] bg-[#F4EDE0]/15 font-bold'
                : 'border-transparent text-[#F4EDE0]/60 hover:text-[#F4EDE0]'
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
                      className="px-3.5 py-1.5 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create Account with {errorPopup.attemptedUsn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setErrorPopup(null)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F4EDE0]/10 hover:bg-[#F4EDE0]/20 text-[#F4EDE0] text-xs transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setErrorPopup(null)}
                className="text-[#F4EDE0]/60 hover:text-[#F4EDE0] p-1 cursor-pointer"
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
                  <label className="text-[#F4EDE0]/70 block mb-1 font-medium">University Seat Number (USN) *</label>
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
                    className="w-full uppercase font-mono px-3 py-2.5 rounded-xl glass-input"
                  />
                </div>

                <div>
                  <label className="text-[#F4EDE0]/70 block mb-1 font-medium">Password *</label>
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
                      className="w-full px-3 py-2.5 pr-10 rounded-xl glass-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F4EDE0]/50 hover:text-[#F4EDE0] transition-colors cursor-pointer"
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
                  className="w-full py-2.5 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold transition-all shadow-lg shadow-black/30 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#14213D]" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to MarksBoard ⚡</span>
                      <ArrowRight className="w-4 h-4 text-[#14213D]" />
                    </>
                  )}
                </button>
              </form>

              {/* Saved Accounts on this Device with Remove Option */}
              {savedAccounts.length > 0 && (
                <div className="pt-3 border-t border-[#F4EDE0]/12 space-y-2">
                  <div className="flex items-center justify-between text-[#F4EDE0]/65 text-[11px]">
                    <span>Saved Accounts on this Device:</span>
                    <span className="text-[10px] text-[#F4EDE0]/50">Tap to switch • Trash to remove</span>
                  </div>
                  <div className="space-y-1.5">
                    {savedAccounts.map((acc) => (
                      <div
                        key={acc.usn}
                        className="w-full p-2.5 rounded-2xl glass-card border border-[#F4EDE0]/10 flex items-center justify-between transition-colors group"
                      >
                        {/* Click to login */}
                        <button
                          type="button"
                          onClick={() => handleQuickLogin(acc.usn)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <span className="w-6 h-6 rounded-lg bg-[#14213D] border border-[#F4EDE0]/20 flex items-center justify-center text-base shrink-0 overflow-hidden shadow-xs">
                            {acc.avatar?.startsWith('http') ? (
                              <img src={acc.avatar} alt={acc.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{acc.avatar || '👨‍💻'}</span>
                            )}
                          </span>
                          <div className="truncate">
                            <div className="font-semibold text-[#F4EDE0] group-hover:text-white transition-colors truncate">
                              {acc.name}
                            </div>
                            <div className="text-[10px] font-mono text-[#F4EDE0]/60 truncate">
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
                              handleForgetAccountOnDevice(acc.usn, acc.name);
                            }}
                            className="p-1.5 rounded-lg text-[#F4EDE0]/50 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Forget from this device's quick login list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickLogin(acc.usn)}
                            className="p-1.5 rounded-lg text-[#F4EDE0]/60 hover:text-[#F4EDE0] cursor-pointer"
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
              <div className="pt-3 border-t border-[#F4EDE0]/12">
                <button
                  type="button"
                  onClick={handleResetToGuest}
                  className="w-full py-2 px-3 rounded-xl bg-[#F4EDE0]/10 hover:bg-[#F4EDE0]/20 text-[#F4EDE0] font-medium transition-all text-center flex items-center justify-center gap-2 border border-[#F4EDE0]/15 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F4EDE0]" />
                  <span>Continue Browsing Demo (Read-Only)</span>
                </button>
              </div>
            </>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="text-[#F4EDE0]/70 block mb-1 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aryan Sharma"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input"
                />
              </div>

              <div>
                <label className="text-[#F4EDE0]/70 block mb-1 font-medium">USN Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1DS22CS088"
                  value={regUsn}
                  onChange={(e) => setRegUsn(e.target.value)}
                  className="w-full uppercase font-mono px-3 py-2 rounded-xl glass-input"
                />
              </div>

              {/* Password with Eye Button */}
              <div>
                <label className="text-[#F4EDE0]/70 block mb-1 font-medium">Create Password *</label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    placeholder="Create a password..."
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-xl glass-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F4EDE0]/50 hover:text-[#F4EDE0] transition-colors cursor-pointer"
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
                <label className="text-[#F4EDE0]/70 block mb-1 font-medium">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm your password..."
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-xl glass-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F4EDE0]/50 hover:text-[#F4EDE0] transition-colors cursor-pointer"
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
                  <label className="text-[#F4EDE0]/70 block mb-1 font-medium">College</label>
                  <input
                    type="text"
                    value={regCollege}
                    onChange={(e) => setRegCollege(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>

                <div>
                  <label className="text-[#F4EDE0]/70 block mb-1 font-medium">Active Sem *</label>
                  <select
                    value={regSemester}
                    onChange={(e) => setRegSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl glass-input bg-[#090e1a]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {regSemester > 1 && (
                <div className="p-2.5 rounded-xl bg-[#F4EDE0]/10 border border-[#F4EDE0]/20 text-[11px] text-[#F4EDE0] flex items-start gap-2 shadow-xs">
                  <Sparkles className="w-4 h-4 shrink-0 text-[#F4EDE0] mt-0.5" />
                  <span>
                    As a Semester {regSemester} student, you'll be prompted to record marks for Semesters 1 to {regSemester - 1} so your cumulative CGPA starts 100% accurate!
                  </span>
                </div>
              )}

              {/* Complete 12 Official Engineering Branches */}
              <div>
                <label className="text-[#F4EDE0]/70 block mb-1 font-medium">Engineering Branch</label>
                <select
                  value={regBranch}
                  onChange={(e) => setRegBranch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input bg-[#090e1a] text-xs"
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
                className="w-full py-2.5 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold transition-all shadow-lg shadow-black/30 flex items-center justify-center gap-2 mt-2 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#14213D]" />
                    <span>Creating Student Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Student ID & Start Tracking 🚀</span>
                    <ArrowRight className="w-4 h-4 text-[#14213D]" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Modal Bottom Bar: Database Status & Directory Shortcut */}
        <div className="px-6 py-3.5 bg-[#090e1a]/60 border-t border-[#F4EDE0]/12 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#F4EDE0]/60">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-[#F4EDE0] shrink-0" />
            {isSupabaseConfigured ? (
              <span className="text-emerald-300 font-medium inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Cloud Database Active
              </span>
            ) : (
              <span className="text-amber-300 font-medium inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Device Storage Mode
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetToGuest}
              className="hover:text-white transition-colors text-[#F4EDE0]/60 cursor-pointer"
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
