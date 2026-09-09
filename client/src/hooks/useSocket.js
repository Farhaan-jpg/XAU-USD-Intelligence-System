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
  const [cotData, setCotData] = useState(null);
  const [latestAlert, setLatestAlert] = useState(null);
  const [calendarAlert, setCalendarAlert] = useState(null);

  const measureLatency = useCallback((socket) => {
    const start = Date.now();
    socket.emit('ping_pong');
    socket.once('ping_pong', () => {
      setLatency(Date.now() - start);
    });
  }, []);

  useEffect(() => {
    const socket = getSocket();

    // Immediate initial fetch to ensure zero startup delay
    const fetchLatestPrices = () => {
      fetch('/api/prices')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Object.keys(data).length > 0) {
            setPrices((prev) => ({ ...data, ...prev }));
          }
        })
        .catch(() => {});
    };
    fetchLatestPrices();

    // Initial fetch for COT & Retail sentiment
    fetch('/api/cot')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setCotData(data);
      })
      .catch(() => {});

    // Backup polling every 2.5s if socket connection is pending or recovering
    const backupPollInterval = setInterval(fetchLatestPrices, 2500);

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
      if (data?.prices) {
        setPrices((prev) => ({ ...prev, ...data.prices }));
      }
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
      if (updatedItem.impact === 'HIGH') {
        setLatestAlert(updatedItem);
      }
    };

    const onCalendarUpdate = (data) => {
      setCalendarData(data);
    };

    const onCalendarAlert = (alert) => {
      setCalendarAlert(alert);
    };

    const onCotUpdate = (data) => {
      if (data) setCotData(data);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('price_update', onPriceUpdate);
    socket.on('news_item', onNewsItem);
    socket.on('news_item_update', onNewsItemUpdate);
    socket.on('news_batch', onNewsBatch);
    socket.on('calendar_update', onCalendarUpdate);
    socket.on('calendar_alert', onCalendarAlert);
    socket.on('cot_update', onCotUpdate);

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
      socket.off('calendar_alert', onCalendarAlert);
      socket.off('cot_update', onCotUpdate);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      clearInterval(backupPollInterval);
    };
  }, [measureLatency]);

  return { connected, latency, prices, newsFeed, calendarData, cotData, latestAlert, calendarAlert };
}
