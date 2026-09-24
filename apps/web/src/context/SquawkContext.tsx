'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface SquawkContextType {
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (vol: number) => void;
  rate: number;
  setRate: (rate: number) => void;
  speak: (text: string, priority?: 'high' | 'normal') => void;
  stop: () => void;
  isSpeaking: boolean;
}

const SquawkContext = createContext<SquawkContextType | null>(null);

export function SquawkProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [rate, setRate] = useState(1.1); // Slightly brisk institutional desk pace
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;

      const pickVoice = () => {
        const voices = synthRef.current?.getVoices() || [];
        // Prefer natural / institutional English accents (GB or US)
        const preferred = voices.find(v => 
          (v.name.includes('Natural') || v.name.includes('Daniel') || v.name.includes('Oliver') || v.name.includes('Samantha') || v.name.includes('Google UK English Male')) && v.lang.startsWith('en')
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        preferredVoiceRef.current = preferred || null;
      };

      pickVoice();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = pickVoice;
      }
    }
  }, []);

  const speak = useCallback((text: string, priority: 'high' | 'normal' = 'normal') => {
    if (!isEnabled || !synthRef.current || !text) return;

    try {
      // If high priority, cancel lower priority items
      if (priority === 'high' && synthRef.current.speaking) {
        synthRef.current.cancel();
      }

      // Format text for audio squawk clarity
      const cleanText = text
        .replace(/\$([A-Z]+)/g, '$1')
        .replace(/\bYoY\b/gi, 'Year on Year')
        .replace(/\bMoM\b/gi, 'Month on Month')
        .replace(/\bQoQ\b/gi, 'Quarter on Quarter')
        .replace(/\bBPS\b/gi, 'Basis Points')
        .replace(/\bCPI\b/gi, 'C.P.I.')
        .replace(/\bNFP\b/gi, 'Non-Farm Payrolls')
        .replace(/\bFOMC\b/gi, 'F.O.M.C.');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.volume = volume;
      utterance.rate = rate;
      utterance.pitch = 1.0;
      if (preferredVoiceRef.current) {
        utterance.voice = preferredVoiceRef.current;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current.speak(utterance);
    } catch (e) {
      console.warn('[Squawk Engine] Speech error:', e);
      setIsSpeaking(false);
    }
  }, [isEnabled, volume, rate]);

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return (
    <SquawkContext.Provider value={{
      isEnabled,
      setIsEnabled,
      volume,
      setVolume,
      rate,
      setRate,
      speak,
      stop,
      isSpeaking
    }}>
      {children}
    </SquawkContext.Provider>
  );
}

export function useSquawk() {
  const ctx = useContext(SquawkContext);
  if (!ctx) {
    throw new Error('useSquawk must be used within SquawkProvider');
  }
  return ctx;
}
