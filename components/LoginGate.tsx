
import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

interface LoginGateProps {
  onLogin: () => void;
}

export const LoginGate: React.FC<LoginGateProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Updated entry password based on user request
    if (password === '03121123') {
      onLogin();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-sm w-full rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-teal-600 p-8 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wider">
            私人旅遊日誌
          </h1>
          <p className="text-teal-100 text-sm mt-1">請輸入通行密碼以繼續</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="輸入密碼"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition text-center text-lg tracking-widest placeholder:tracking-normal"
                autoFocus
              />
              {error && (
                <p className="text-red-500 text-xs text-center mt-2 font-medium animate-pulse">
                  密碼錯誤，請重新輸入
                </p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2 group"
            >
              進入日誌
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
          
          <p className="text-center text-slate-300 text-xs mt-6">
            Protected by TravelLog Security
          </p>
        </div>
      </div>
    </div>
  );
};
