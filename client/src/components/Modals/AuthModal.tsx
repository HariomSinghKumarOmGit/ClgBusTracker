// client/src/components/Modals/AuthModal.tsx
import React, { useState } from 'react';
import { UserRole } from '../../types';
import { Lock, X, KeyRound, Shield, Radio, CheckCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: UserRole;
  onAuthenticate: (pin: string) => Promise<boolean>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  targetRole,
  onAuthenticate
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const defaultPin = targetRole === 'driver' ? '1234' : 'admin123';

  const handleSubmit = async (e?: React.FormEvent, customPin?: string) => {
    if (e) e.preventDefault();
    const pinToTest = customPin || pin;
    if (!pinToTest) return;

    setIsVerifying(true);
    setError('');
    try {
      const ok = await onAuthenticate(pinToTest);
      if (ok) {
        onClose();
      } else {
        setError('Incorrect PIN. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleQuickDemo = () => {
    setPin(defaultPin);
    handleSubmit(undefined, defaultPin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200/80 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              targetRole === 'driver' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
            }`}>
              {targetRole === 'driver' ? <Radio className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 capitalize">
                {targetRole} Authentication
              </h2>
              <p className="text-[11px] text-slate-500">
                {targetRole === 'driver' ? 'Authorized bus driver sign-in' : 'College transport administrator'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Enter {targetRole === 'driver' ? 'Driver PIN' : 'Admin Passcode'}:
            </label>
            <input
              type="password"
              required
              autoFocus
              placeholder={`Default: ${defaultPin}`}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-3 py-2.5 text-center tracking-widest text-base font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow transition-all active:scale-95"
          >
            {isVerifying ? 'Verifying PIN...' : 'Verify & Continue'}
          </button>
        </form>

        {/* 1-Click Quick Demo Button */}
        <div className="pt-2 border-t border-slate-100 text-center">
          <button
            onClick={handleQuickDemo}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1 mx-auto"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Click to Auto-fill Demo PIN ({defaultPin})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
