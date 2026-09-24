'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { EconomicEvent, NewsWireItem, DeviationAlert, CotLatestData } from '../lib/types';
import { useAuth } from './AuthContext';
import { fetchCotLatest } from '../lib/api';

interface SocketContextType {
  isConnected: boolean;
  latency: number;
  events: EconomicEvent[];
  news: NewsWireItem[];
  latestAlert: DeviationAlert | null;
  cotData: CotLatestData | null;
  clearAlert: () => void;
  setEvents: React.Dispatch<React.SetStateAction<EconomicEvent[]>>;
  setNews: React.Dispatch<React.SetStateAction<NewsWireItem[]>>;
  setCotData: React.Dispatch<React.SetStateAction<CotLatestData | null>>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(2);
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [news, setNews] = useState<NewsWireItem[]>([]);
  const [cotData, setCotData] = useState<CotLatestData | null>(null);
  const [latestAlert, setLatestAlert] = useState<DeviationAlert | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initial load of COT data
  useEffect(() => {
    fetchCotLatest()
      .then((data) => setCotData(data))
      .catch((err) => console.warn('Failed initial COT fetch:', err.message));
  }, []);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

    const socket = io(socketUrl, {
      auth: { token: user?.token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 2000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('telemetry:heartbeat', (data: { latencyMs: number }) => {
      if (data?.latencyMs !== undefined) {
        setLatency(data.latencyMs);
      }
    });

    socket.on('calendar:event', (newEvent: EconomicEvent) => {
      setEvents((prev) => {
        const existingIndex = prev.findIndex((e) => e.id === newEvent.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newEvent;
          return updated;
        } else {
          return [newEvent, ...prev].slice(0, 100);
        }
      });
    });

    socket.on('calendar:deviation_alert', (alert: DeviationAlert) => {
      setLatestAlert(alert);
      setTimeout(() => {
        setLatestAlert((cur) => (cur?.alertTime === alert.alertTime ? null : cur));
      }, 10000);
    });

    socket.on('news:item', (item: NewsWireItem) => {
      setNews((prev) => {
        if (prev.some((n) => n.id === item.id)) return prev;
        return [item, ...prev].slice(0, 50);
      });
    });

    socket.on('cot:update', (payload: CotLatestData) => {
      setCotData(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const clearAlert = () => setLatestAlert(null);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        latency,
        events,
        news,
        latestAlert,
        cotData,
        clearAlert,
        setEvents,
        setNews,
        setCotData
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
