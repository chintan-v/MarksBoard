import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Camera,
  CheckCircle,
  LogOut,
  KeyRound,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import type { StudentProfile } from '../types';
import { ENGINEERING_BRANCHES } from '../types';
import { deleteSavedAccountAsync, saveStudentProfileAsync } from '../utils/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onUpdateProfile: (updated: StudentProfile) => void;
  onLogout: () => void;
  onRequireAuth?: (reason: string) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

const AVATAR_OPTIONS = [
  '👨‍💻', '👩‍💻', '🧑‍💻', '⚡', '🚀', '🤖', '🎧', '🎮',
  '🕶️', '🦊', '🐉', '👾', '🥋', '🦄', '🦁', '🦉',
  '🏎️', '💎', '🔥', '💻', '💡', '✨', '🎯', '📚',
];

const BIO_PRESETS = [
  'Member Of Student affairs 😎',
  'Grinding for that 9.5+ SGPA 📈🔥',
  'Bugs in code, sleep on floor 💻☕',
  'DSA by day, hackathons by night 🏆',
  'Clutch king before exam night 🌙⚡',
  'Automating life one script at a time 🤖',
];

export const ProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  onLogout,
  onRequireAuth,
  onShowToast,
}) => {
  const [name, setName] = useState(profile.name);
  const [usn, setUsn] = useState(profile.usn);
  const [college, setCollege] = useState(profile.college);
  const [branch, setBranch] = useState(profile.branch);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [targetCGPA, setTargetCGPA] = useState(profile.targetCGPA);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Account Deletion State
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmUsn, setDeleteConfirmUsn] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setName(profile.name);
      setUsn(profile.usn);
      setCollege(profile.college);
      setBranch(profile.branch);
      setBio(profile.bio);
      setAvatar(profile.avatar);
      setTargetCGPA(profile.targetCGPA);
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordError('');
      setPasswordSuccess('');
      setIsDeletingAccount(false);
      setDeleteConfirmUsn('');
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile.isGuest) {
      onClose();
      onRequireAuth?.('customize profile name, avatar, USN, and bio');
      return;
    }
    const updated: StudentProfile = {
      ...profile,
      name: name.trim() || profile.name,
      usn: usn.trim().toUpperCase() || profile.usn,
      college: college.trim() || 'Dayananda Sagar University',
      branch: branch.trim() || 'Computer Science & Engineering',
      bio: bio.trim(),
      avatar: customAvatarUrl.trim() || avatar,
      targetCGPA: Number(targetCGPA) || 9.0,
    };
    onUpdateProfile(updated);
    await saveStudentProfileAsync(updated);
    onShowToast?.('success', 'Profile details updated successfully!', 'Profile Saved');
    onClose();
  };

  const handleSavePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (profile.password && profile.password !== currentPassword) {
      setPasswordError('Current password is incorrect.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const updated: StudentProfile = {
        ...profile,
        password: newPassword,
      };
      await saveStudentProfileAsync(updated);
      onUpdateProfile(updated);
      setPasswordSuccess('Password updated successfully!');
      onShowToast?.('success', 'Your account password has been updated.', 'Password Changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsChangingPassword(false);
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to update password.');
      onShowToast?.('error', 'Failed to update password.', 'Error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmUsn.trim().toUpperCase() !== profile.usn.toUpperCase()) {
      alert(`Please type your USN "${profile.usn}" exactly to confirm deletion.`);
      return;
    }

    if (!window.confirm(`Are you absolutely sure? This will permanently delete ${profile.usn} and all associated marks from both this device and Supabase cloud.`)) {
      return;
    }

    setIsSubmittingDelete(true);
    try {
      await deleteSavedAccountAsync(profile.usn);
      onShowToast?.('info', `Account ${profile.usn} has been permanently deleted.`, 'Account Deleted');
      onLogout();
      onClose();
    } catch (err: any) {
      alert('Failed to delete account: ' + (err?.message || 'Unknown error'));
      onShowToast?.('error', 'Failed to delete account from cloud database.', 'Deletion Error');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-xl glass-panel-deep rounded-3xl border border-[#F4EDE0]/20 shadow-2xl overflow-hidden bg-[#14213D]/95 max-h-[92vh] flex flex-col my-auto text-[#F4EDE0]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#F4EDE0]/12 flex items-center justify-between bg-gradient-to-r from-[#14213D] via-[#1a2b4f]/70 to-[#14213D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F4EDE0]/15 border border-[#F4EDE0]/30 flex items-center justify-center text-xl overflow-hidden shrink-0 shadow-xs">
              {customAvatarUrl ? (
                <img src={customAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : avatar?.startsWith('http') ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{avatar || '👨‍💻'}</span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold font-heading text-[#F4EDE0]">
                Engineer Profile & Settings
              </h3>
              <p className="text-xs text-[#F4EDE0]/65">
                Manage your credentials, details, and dashboard bio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#F4EDE0]/60 hover:text-[#F4EDE0] hover:bg-[#F4EDE0]/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 text-xs">
          {profile.isGuest && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
              <div>
                <span className="font-bold block">Previewing Demo Profile</span>
                <span className="text-[11px] text-amber-200/80">
                  Create or sign into an account to customize bio, avatar, and security.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequireAuth?.('create your personalized student ID');
                }}
                className="px-3 py-1.5 rounded-xl bg-[#F4EDE0] text-[#14213D] font-bold text-xs shrink-0 shadow-md cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Avatar Selector */}
          <div className="space-y-2">
            <label className="text-[#F4EDE0]/70 font-medium block">Choose Emoji Avatar</label>
            <div className="grid grid-cols-8 gap-2 p-3 rounded-2xl bg-[#090e1a]/60 border border-[#F4EDE0]/12">
              {AVATAR_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setAvatar(opt);
                    setCustomAvatarUrl('');
                  }}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform hover:scale-110 cursor-pointer ${
                    avatar === opt && !customAvatarUrl
                      ? 'bg-[#F4EDE0]/30 border border-[#F4EDE0] scale-105 shadow-xs'
                      : 'hover:bg-[#F4EDE0]/10'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Custom Avatar URL */}
            <div className="pt-2">
              <label className="text-[#F4EDE0]/70 font-medium block mb-1">Or Paste Image URL</label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://example.com/my-photo.jpg"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  className="w-full px-3 py-2 pl-9 rounded-xl glass-input text-xs"
                />
                <Camera className="w-4 h-4 text-[#F4EDE0]/50 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Name & USN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[#F4EDE0]/70 block mb-1 font-medium">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aryan Sharma"
                className="w-full px-3 py-2 rounded-xl glass-input"
              />
            </div>

            <div>
              <label className="text-[#F4EDE0]/70 block mb-1 font-medium">University Seat Number (USN)</label>
              <input
                type="text"
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
                placeholder="1DS22CS088"
                className="w-full uppercase font-mono px-3 py-2 rounded-xl glass-input"
              />
            </div>
          </div>

          {/* College & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[#F4EDE0]/70 block mb-1 font-medium">University / College Name</label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="Dayananda Sagar University"
                className="w-full px-3 py-2 rounded-xl glass-input"
              />
            </div>

            <div>
              <label className="text-[#F4EDE0]/70 block mb-1 font-medium">Engineering Branch</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input bg-[#090e1a] text-xs"
              >
                {ENGINEERING_BRANCHES.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.id}. {b.name} ({b.shortName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target CGPA */}
          <div>
            <label className="text-[#F4EDE0]/70 block mb-1 font-medium">Target Graduation CGPA</label>
            <input
              type="number"
              step="0.05"
              min="4"
              max="10"
              value={targetCGPA}
              onChange={(e) => setTargetCGPA(Number(e.target.value))}
              placeholder="e.g. 9.25"
              className="w-full px-3 py-2 rounded-xl glass-input"
            />
          </div>

          {/* Bio & Tagline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[#F4EDE0]/70 font-medium">Engineer Bio / Tagline</label>
              <span className="text-[11px] text-[#F4EDE0]">Flex on your dashboard 😎</span>
            </div>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Member Of Student affairs 😎"
              className="w-full px-3 py-2 rounded-xl glass-input"
            />

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {BIO_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBio(preset)}
                  className="text-[10px] px-2.5 py-1 rounded-xl bg-[#F4EDE0]/10 hover:bg-[#F4EDE0]/20 text-[#F4EDE0] border border-[#F4EDE0]/15 transition-colors cursor-pointer shadow-xs"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Password Management */}
          {!profile.isGuest && (
            <div className="p-4 rounded-2xl glass-card border border-[#F4EDE0]/12 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#F4EDE0]" />
                  <span className="font-semibold text-[#F4EDE0]">Security & Password</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(!isChangingPassword);
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="text-xs text-[#F4EDE0] hover:underline font-medium cursor-pointer"
                >
                  {isChangingPassword ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              {isChangingPassword && (
                <div className="space-y-3 pt-2 border-t border-[#F4EDE0]/10 animate-fadeIn">
                  {passwordError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px]">
                      {passwordSuccess}
                    </div>
                  )}

                  <div>
                    <label className="text-[#F4EDE0]/70 block mb-1 font-medium">Current Password *</label>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password..."
                        className="w-full px-3 py-2 pr-9 rounded-xl glass-input text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#F4EDE0]/50 hover:text-[#F4EDE0] cursor-pointer"
                      >
                        {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[#F4EDE0]/70 block mb-1 font-medium">New Password *</label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password..."
                          className="w-full px-3 py-2 pr-9 rounded-xl glass-input text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#F4EDE0]/50 hover:text-[#F4EDE0] cursor-pointer"
                        >
                          {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[#F4EDE0]/70 block mb-1 font-medium">Confirm New Password *</label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Confirm new password..."
                          className="w-full px-3 py-2 pr-9 rounded-xl glass-input text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#F4EDE0]/50 hover:text-[#F4EDE0] cursor-pointer"
                        >
                          {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSavePassword}
                    disabled={isSavingPassword}
                    className="px-4 py-2 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-[#14213D]" />
                    <span>{isSavingPassword ? 'Updating...' : 'Update Password'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Danger Zone: Account Deletion */}
          {!profile.isGuest && (
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-300">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span className="font-semibold">Danger Zone</span>
                </div>
                {!isDeletingAccount && (
                  <button
                    type="button"
                    onClick={() => setIsDeletingAccount(true)}
                    className="px-3 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Delete Account
                  </button>
                )}
              </div>

              {isDeletingAccount ? (
                <div className="space-y-3 pt-2 border-t border-rose-500/20 animate-fadeIn">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>
                      Permanently delete student account <strong>{profile.usn}</strong> and all recorded marks from Supabase cloud database and this device. This cannot be undone.
                    </span>
                  </div>

                  <div>
                    <label className="text-rose-300 block mb-1 text-[11px] font-medium">
                      Type your USN <span className="font-mono font-bold text-white">"{profile.usn}"</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmUsn}
                      onChange={(e) => setDeleteConfirmUsn(e.target.value)}
                      placeholder={`Type ${profile.usn}...`}
                      className="w-full px-3 py-2 rounded-xl glass-input border-rose-500/40 text-white uppercase font-mono text-xs focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmDeleteAccount}
                      disabled={deleteConfirmUsn.trim().toUpperCase() !== profile.usn.toUpperCase() || isSubmittingDelete}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isSubmittingDelete ? 'Deleting...' : 'Permanently Delete Account'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeletingAccount(false);
                        setDeleteConfirmUsn('');
                      }}
                      className="px-3 py-2 rounded-xl bg-[#F4EDE0]/10 hover:bg-[#F4EDE0]/20 text-[#F4EDE0] text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[#F4EDE0]/60">
                  Delete your registered account <span className="font-mono text-[#F4EDE0]">{profile.usn}</span> and all associated semester scores.
                </p>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#F4EDE0]/12 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to log out of this account?')) {
                  onLogout();
                  onClose();
                }
              }}
              className="px-3.5 py-2 rounded-xl text-rose-300 hover:bg-rose-500/10 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-[#F4EDE0]/70 hover:text-[#F4EDE0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold shadow-lg shadow-black/30 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-[#14213D]" /> Save Profile
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
