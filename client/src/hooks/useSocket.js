// client/src/hooks/useSocket.js
// Singleton Socket.io connection with reconnect, latency, and state management

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || '';

let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
  }
  return socketInstance;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState(null);
  const pingTimerRef = useRef(null);

  const [prices, setPrices] = useState({});
  const [newsFeed, setNewsFeed] = useState([]);
  const [calendarData, setCalendarData] = useState(null);
  const [latestAlert, setLatestAlert] = useState(null);

  const measureLatency = useCallback((socket) => {
    const start = Date.now();
    socket.emit('ping_pong');
    socket.once('ping_pong', () => {
      setLatency(Date.now() - start);
    });
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setConnected(true);
      measureLatency(socket);
      // Start periodic latency measurement
      pingTimerRef.current = setInterval(() => measureLatency(socket), 10000);
    };

    const onDisconnect = () => {
      setConnected(false);
      setLatency(null);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    };

    const onPriceUpdate = (data) => {
      setPrices(data.prices || {});
    };

    const onNewsItem = (item) => {
      setNewsFeed((prev) => {
        const exists = prev.some((n) => n.id === item.id);
        if (exists) return prev;
        const next = [item, ...prev].slice(0, 50);
        return next;
      });

      // Set as latest alert for notification effects
      if (item.impact === 'HIGH') {
        setLatestAlert(item);
        // Play audio notification if supported
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
        } catch (_) { /* AudioContext not available */ }
      }
    };

    const onNewsBatch = (items) => {
      setNewsFeed((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const newItems = items.filter((n) => !existingIds.has(n.id));
        return [...newItems, ...prev].slice(0, 50);
      });
    };

    const onNewsItemUpdate = (updatedItem) => {
      setNewsFeed((prev) =>
        prev.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item))
      );
    };

    const onCalendarUpdate = (data) => {
      setCalendarData(data);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('price_update', onPriceUpdate);
    socket.on('news_item', onNewsItem);
    socket.on('news_item_update', onNewsItemUpdate);
    socket.on('news_batch', onNewsBatch);
    socket.on('calendar_update', onCalendarUpdate);

    // Sync initial state if already connected
    if (socket.connected) {
      setConnected(true);
      measureLatency(socket);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('price_update', onPriceUpdate);
      socket.off('news_item', onNewsItem);
      socket.off('news_item_update', onNewsItemUpdate);
      socket.off('news_batch', onNewsBatch);
      socket.off('calendar_update', onCalendarUpdate);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    };
  }, [measureLatency]);

  return { connected, latency, prices, newsFeed, calendarData, latestAlert };
}
