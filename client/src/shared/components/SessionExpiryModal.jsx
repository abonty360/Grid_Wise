import { useNavigate } from 'react-router-dom';
import { Clock, LogIn, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { PATHS } from '../../router/routes';

export default function SessionExpiryModal() {
  const navigate = useNavigate();
  const { sessionExpired, dismissSessionExpired } = useAuthStore();

  if (!sessionExpired) return null;

  const handleSignIn = () => {
    dismissSessionExpired();
    navigate(PATHS.LOGIN);
  };

  const handleDismiss = () => {
    dismissSessionExpired();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl shadow-amber-500/10 text-center relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>

        <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 inline-block mb-2">
          Security Alert
        </span>

        <h2 className="text-xl font-black text-white">Session Expired</h2>
        <p className="text-xs text-slate-400 mt-2 mb-6 leading-relaxed">
          Your security token has expired. For facility safety and data integrity, please re-authenticate to keep your optimization scenarios synchronized.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            Continue as Guest
          </button>
          <button
            onClick={handleSignIn}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <LogIn className="w-4 h-4" /> Sign In Again
          </button>
        </div>
      </div>
    </div>
  );
}
