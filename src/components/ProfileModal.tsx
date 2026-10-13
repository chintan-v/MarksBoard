import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Camera,
  CheckCircle,
  LogOut,
} from 'lucide-react';
import type { StudentProfile } from '../types';
import { ENGINEERING_BRANCHES } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onUpdateProfile: (updated: StudentProfile) => void;
  onLogout: () => void;
  onRequireAuth?: (reason: string) => void;
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
}) => {
  const [name, setName] = useState(profile.name);
  const [usn, setUsn] = useState(profile.usn);
  const [college, setCollege] = useState(profile.college);
  const [branch, setBranch] = useState(profile.branch);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [targetCGPA, setTargetCGPA] = useState(profile.targetCGPA);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (profile.isGuest) {
      onClose();
      onRequireAuth?.('customize profile name, avatar, USN, and bio');
      return;
    }
    onUpdateProfile({
      ...profile,
      name: name.trim() || profile.name,
      usn: usn.trim().toUpperCase() || profile.usn,
      college: college.trim() || 'Dayananda Sagar University',
      branch: branch.trim() || 'Computer Science & Engineering',
      bio: bio.trim(),
      avatar: customAvatarUrl.trim() || avatar,
      targetCGPA: Number(targetCGPA) || 9.0,
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-xl glass-panel rounded-3xl border border-fuchsia-500/30 shadow-2xl overflow-hidden bg-slate-900/95 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-fuchsia-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-xl overflow-hidden shrink-0">
              {customAvatarUrl ? (
                <img src={customAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : avatar?.startsWith('http') ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{avatar || '👨‍💻'}</span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold font-heading text-white">
                Engineer Profile & Bio
              </h3>
              <p className="text-xs text-slate-400">
                Personalize your dashboard presence and university details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 text-xs">
          {profile.isGuest && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
              <div>
                <strong className="text-amber-300 block font-semibold">Demo Guest Account ({profile.name})</strong>
                <span className="text-[11px] text-amber-200/80">Saving changes requires signing in or creating a student account.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequireAuth?.('save profile and account details');
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shrink-0 transition-colors"
              >
                Sign In / Register
              </button>
            </div>
          )}

          {/* Avatar Selector */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-fuchsia-400" />
              Choose Your Gen-Z Avatar
            </label>
            <div className="grid grid-cols-8 gap-2 p-2 rounded-2xl bg-black/40 border border-white/10">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setAvatar(emoji);
                    setCustomAvatarUrl('');
                  }}
                  className={`text-xl p-2 rounded-xl transition-all ${
                    avatar === emoji && !customAvatarUrl
                      ? 'bg-fuchsia-500/30 border border-fuchsia-400 scale-110 shadow-lg shadow-fuchsia-500/20'
                      : 'hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="pt-1">
              <input
                type="url"
                placeholder="Or paste custom image URL..."
                value={customAvatarUrl}
                onChange={(e) => setCustomAvatarUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500"
              />
            </div>
          </div>

          {/* Name & USN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Student Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aryan Sharma"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-fuchsia-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">USN Number *</label>
              <input
                type="text"
                required
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
                placeholder="e.g. 1DS22CS088"
                className="w-full font-mono uppercase px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-fuchsia-500"
              />
            </div>
          </div>

          {/* College & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">University / College Name</label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="Dayananda Sagar University"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-fuchsia-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">Engineering Branch</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-fuchsia-500 text-xs"
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
            <label className="text-slate-400 block mb-1 font-medium">Target Graduation CGPA</label>
            <input
              type="number"
              step="0.05"
              min="4"
              max="10"
              value={targetCGPA}
              onChange={(e) => setTargetCGPA(Number(e.target.value))}
              placeholder="e.g. 9.25"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-fuchsia-500"
            />
          </div>

          {/* Bio & Tagline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-400 font-medium">Engineer Bio / Tagline</label>
              <span className="text-[11px] text-fuchsia-400">Flex on your dashboard 😎</span>
            </div>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Member Of Student affairs 😎"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-fuchsia-500"
            />

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {BIO_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBio(preset)}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to log out of this account?')) {
                  onLogout();
                  onClose();
                }
              }}
              className="px-3.5 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-fuchsia-600/30 flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> Save Profile
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
