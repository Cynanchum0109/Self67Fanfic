import React, { useEffect, useRef, useState } from 'react';
import { verifyPasscode } from '../utils/auth';

interface PasswordGateProps {
  lang: 'zh' | 'en';
  onUnlock: () => void;
  onCancel: () => void;
}

const PasswordGate: React.FC<PasswordGateProps> = ({ lang, onUnlock, onCancel }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    const ok = await verifyPasscode(code);
    setChecking(false);
    if (ok) {
      onUnlock();
    } else {
      setError(true);
      setCode('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#FAF8F1]/95 backdrop-blur-sm px-6">
      <form onSubmit={submit} className="w-full max-w-xs text-center space-y-7 animate-float-in">
        <div className="flex items-center justify-center gap-3" aria-hidden>
          <span className="w-10 h-px bg-gradient-to-r from-transparent to-[#C6B8D8]" />
          <span className="text-[#A99BC1] text-sm leading-none serif-text">❦</span>
          <span className="w-10 h-px bg-gradient-to-l from-transparent to-[#C6B8D8]" />
        </div>

        <label htmlFor="garden-passcode" className="block text-lg text-[#7A688F] serif-text tracking-[0.05em]">
          {lang === 'zh' ? '神秘四位数字？' : '🔮⛈️🔮⛈️（4 digit）'}
        </label>

        <input
          id="garden-passcode"
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 4));
            setError(false);
          }}
          className={`w-40 mx-auto block bg-transparent border-b text-center text-2xl tracking-[0.6em] indent-[0.6em] py-2 serif-text text-[#4A4458] outline-none transition-colors ${
            error ? 'border-[#C98B8B]' : 'border-[#C6B8D8] focus:border-[#7A688F]'
          }`}
        />

        <p className={`text-xs serif-text transition-opacity ${error ? 'text-[#C98B8B] opacity-100' : 'opacity-0'}`}>
          {lang === 'zh' ? '不对哦，再想想。' : 'Not quite. Try again.'}
        </p>

        <div className="flex flex-col items-center gap-4">
          <button
            type="submit"
            disabled={code.length !== 4 || checking}
            className="inline-flex items-center gap-3 px-10 py-3 bg-[#7A688F] text-[#FAF8F1] rounded-full font-medium transition-all duration-300 hover:bg-[#68577F] active:scale-95 disabled:opacity-40 disabled:active:scale-100 shadow-lg shadow-[#7A688F]/25 text-[0.8rem] uppercase tracking-[0.2em] serif-text"
          >
            {lang === 'zh' ? '进入' : 'Enter'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-[#B3A5C9] hover:text-[#7A688F] transition-colors serif-text uppercase tracking-[0.2em]"
          >
            {lang === 'zh' ? '返回' : 'Back'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordGate;
