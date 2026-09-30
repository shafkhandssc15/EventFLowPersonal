import React, { useState, useEffect } from 'react';
import { User, UserRole } from './lib/types';
import { MobileFrame } from './components/MobileFrame';
import { MobileApp } from './components/MobileApp';
import { LoginModal } from './components/LoginModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('ef_auth_session');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading saved session:', e);
    }
    return null;
  });

  const [authModalState, setAuthModalState] = useState<{
    open: boolean;
    mode: 'login' | 'signup';
  }>({
    open: false,
    mode: 'login',
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ef_auth_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('ef_auth_session');
    }
  }, [currentUser]);

  const handleOpenAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthModalState({ open: true, mode });
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#050811] text-white flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden relative font-sans">
      {/* Subtle luxury ambient back-glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-purple-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Pure Mobile App Container */}
      <div className="w-full h-full sm:h-auto flex items-center justify-center relative z-10">
        <MobileFrame>
          <MobileApp
            currentUser={currentUser}
            onOpenLogin={handleOpenAuth}
            onLogout={handleLogout}
            onSwitchUser={(user) => setCurrentUser(user)}
          />
        </MobileFrame>
      </div>

      {/* Authentication Modal (Sign In & Create Account) */}
      {authModalState.open && (
        <LoginModal
          initialMode={authModalState.mode}
          onClose={() => setAuthModalState({ open: false, mode: 'login' })}
          onSuccess={(user) => {
            setCurrentUser(user);
          }}
        />
      )}
    </div>
  );
}
