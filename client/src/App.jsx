import { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import Header from './components/Header';
import MarketStructure from './components/MarketStructure';
import PriceGrid from './components/PriceGrid';
import NewsFeed from './components/NewsFeed';
import Calendar from './components/Calendar';
import AlertBanner from './components/AlertBanner';
import StatusBar from './components/StatusBar';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const { connected, latency, prices, newsFeed, calendarData, latestAlert } = useSocket();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const showAlertBanner = calendarData?.preEventAlert;

  return (
    <div className="app">
      {/* Sticky Header with Settings Button */}
      <Header
        connected={connected}
        latency={latency}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Dashboard Grid */}
      <main className="dashboard-grid">

        {/* Alert Banner — full width, only when T-5 triggered */}
        {showAlertBanner && (
          <AlertBanner calendarData={calendarData} />
        )}

        {/* Left column: Market Structure + Price Grid + Calendar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Dynamic Overall Market Structure Engine */}
          <MarketStructure prices={prices} newsFeed={newsFeed} calendarData={calendarData} />
          
          {/* Correlated Instruments Live Price Grid */}
          <PriceGrid prices={prices} />
          
          {/* Economic Calendar & Countdown */}
          <Calendar calendarData={calendarData} />
        </div>

        {/* Right column: News Feed (tall, expandable, direct links) */}
        <NewsFeed newsFeed={newsFeed} />

      </main>

      {/* Status Bar */}
      <StatusBar
        connected={connected}
        prices={prices}
        newsFeed={newsFeed}
        calendarData={calendarData}
      />

      {/* Customization Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
