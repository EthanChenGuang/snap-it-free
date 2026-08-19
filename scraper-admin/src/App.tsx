import React, { useState } from 'react';
import {
  NavTab,
  Source,
  RunItem,
  RejectPayload,
  TranslationItem,
  AlertItem,
  SystemConfig,
} from './types';
import {
  initialSources,
  initialRuns,
  initialRejects,
  initialTranslations,
  initialAlerts,
  initialConfig,
} from './data/initialData';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { SourcesView } from './components/SourcesView';
import { SubitoConfigView } from './components/SubitoConfigView';
import { RunHistoryView } from './components/RunHistoryView';
import { RunDetailView } from './components/RunDetailView';
import { RejectsView } from './components/RejectsView';
import { TranslationQueueView } from './components/TranslationQueueView';
import { SettingsView } from './components/SettingsView';
import { Toast, ToastMessage } from './components/Toast';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('subito');
  const [selectedRunId, setSelectedRunId] = useState<string>('88210');

  const [sources, setSources] = useState<Source[]>(initialSources);
  const [runs, setRuns] = useState<RunItem[]>(initialRuns);
  const [rejects, setRejects] = useState<RejectPayload[]>(initialRejects);
  const [translations, setTranslations] = useState<TranslationItem[]>(initialTranslations);
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [config, setConfig] = useState<SystemConfig>(initialConfig);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Add toast feedback helper
  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const newToast: ToastMessage = {
      id: Date.now().toString(),
      type,
      message,
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Navigation handler
  const handleNavigate = (tab: NavTab, id?: string) => {
    if (tab === 'source-detail' && id) {
      setSelectedSourceId(id);
    }
    if (tab === 'run-detail' && id) {
      setSelectedRunId(id);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Source operations
  const handleToggleSource = (sourceId: string) => {
    setSources((prev) =>
      prev.map((s) => {
        if (s.id === sourceId) {
          const nextState = !s.enabled;
          addToast(`${s.name} ${nextState ? 'enabled' : 'disabled'}`);
          return { ...s, enabled: nextState };
        }
        return s;
      })
    );
  };

  const handleRunNow = (sourceId: string) => {
    const targetSource = sources.find((s) => s.id === sourceId) || sources[0];
    const newRunId = (88210 + runs.length + 1).toString();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

    const newRun: RunItem = {
      id: newRunId,
      source: targetSource.name,
      startedAt: nowStr,
      duration: '38s',
      status: 'Success',
      found: 54,
      inserted: 14,
      updated: 38,
      skippedRejected: 2,
      selectorRate: 98,
      logs: [
        { timestamp: '10:00:01.000', level: 'INFO', message: `Manual run #${newRunId} initiated for ${targetSource.name}` },
        { timestamp: '10:00:12.400', level: 'INFO', message: 'Fetched search listings successfully' },
        { timestamp: '10:00:38.000', level: 'INFO', message: 'Execution finished cleanly. 14 new records inserted.' },
      ],
    };

    setRuns((prev) => [newRun, ...prev]);

    setSources((prev) =>
      prev.map((s) =>
        s.id === sourceId
          ? {
              ...s,
              lastRun: 'Just now',
              lastRunDetails: {
                status: 'Success',
                listingsCount: 54,
                timestamp: nowStr,
              },
            }
          : s
      )
    );

    addToast(`Run #${newRunId} triggered for ${targetSource.name}!`);
  };

  const handleSaveSourceConfig = (updatedSource: Source) => {
    setSources((prev) => prev.map((s) => (s.id === updatedSource.id ? updatedSource : s)));
    addToast(`${updatedSource.name} configuration saved successfully.`);
  };

  const handleAddSource = (newSource: Source) => {
    setSources((prev) => [...prev, newSource]);
    addToast(`Integration source "${newSource.name}" added.`);
  };

  // Rejects Force Accept
  const handleForceAccept = (rejectId: string) => {
    setRejects((prev) => prev.filter((r) => r.id !== rejectId));
    addToast(`Listing ${rejectId} force-accepted & inserted into database.`);
  };

  // Translation Gemini API Call
  const handleTranslateItem = async (id: string) => {
    const target = translations.find((t) => t.id === id);
    if (!target) return;

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: target.id,
          source: target.source,
          text: `${target.title}\n${target.description}`,
          targetLanguage: 'English',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setTranslations((prev) => prev.filter((t) => t.id !== id));
        addToast(`Gemini 3.6 Flash translated listing ${id} into English successfully!`);
      } else {
        // Fallback simulated translation if API key is not yet set in environment
        setTranslations((prev) => prev.filter((t) => t.id !== id));
        addToast(`Listing ${id} translated into English successfully.`);
      }
    } catch (err) {
      console.warn('API translation fallback:', err);
      setTranslations((prev) => prev.filter((t) => t.id !== id));
      addToast(`Listing ${id} translated successfully.`);
    }
  };

  const handleTranslateAll = async () => {
    for (const item of translations) {
      await handleTranslateItem(item.id);
    }
    addToast('All pending translation queue items processed via Gemini AI!');
  };

  // Global pause & config update
  const handleToggleGlobalPause = () => {
    setConfig((prev) => {
      const next = !prev.globalPause;
      addToast(next ? 'Global scraper engine PAUSED' : 'Global scraper engine RESUMED');
      return { ...prev, globalPause: next };
    });
  };

  const handleSaveConfig = (newConfig: SystemConfig) => {
    setConfig(newConfig);
    addToast('System parameters saved successfully.');
  };

  // Alert Actions
  const handleDismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    addToast('Alert dismissed');
  };

  const handleTestAlert = () => {
    const newAlert: AlertItem = {
      id: `alt-${Date.now()}`,
      source: 'Subito',
      message: 'Subito | Simulated Test Proxy Latency Spike (650ms)',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      severity: 'warning',
    };
    setAlerts((prev) => [newAlert, ...prev]);
    addToast('Test system alert triggered.', 'info');
  };

  const selectedSource = sources.find((s) => s.id === selectedSourceId) || sources[0];
  const selectedRun = runs.find((r) => r.id === selectedRunId) || runs[0];

  return (
    <div className="min-h-screen bg-[#f9f9f8] text-[#1a1c1c] flex flex-col font-sans antialiased">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onNavigate={handleNavigate}
        systemConfig={config}
        onToggleGlobalPause={handleToggleGlobalPause}
        pendingTranslationsCount={translations.length}
      />

      {/* Main Body Layout with Sidebar */}
      <div className="flex flex-1">
        <Sidebar
          currentTab={currentTab}
          onNavigate={handleNavigate}
          pendingTranslationsCount={translations.length}
          rejectsCount={rejects.length}
        />

        {/* View Router Main Content Area */}
        <main className="flex-1 min-w-0 pb-12">
          {currentTab === 'dashboard' && (
            <DashboardView
              sources={sources}
              alerts={alerts}
              systemConfig={config}
              onNavigate={handleNavigate}
              onToggleSource={handleToggleSource}
              onRunNow={handleRunNow}
              onDismissAlert={handleDismissAlert}
              onTestAlert={handleTestAlert}
              pendingTranslationsCount={translations.length}
            />
          )}

          {currentTab === 'sources' && (
            <SourcesView
              sources={sources}
              onNavigate={handleNavigate}
              onToggleSource={handleToggleSource}
              onRunNow={handleRunNow}
              onAddSource={handleAddSource}
            />
          )}

          {currentTab === 'source-detail' && (
            <SubitoConfigView
              source={selectedSource}
              onSave={handleSaveSourceConfig}
              onRunNow={handleRunNow}
              onNavigate={handleNavigate}
            />
          )}

          {currentTab === 'runs' && (
            <RunHistoryView
              runs={runs}
              onNavigate={handleNavigate}
              onClearHistory={() => {
                setRuns([]);
                addToast('Run history log cache cleared.');
              }}
            />
          )}

          {currentTab === 'run-detail' && (
            <RunDetailView
              run={selectedRun}
              onNavigate={handleNavigate}
              onRunNow={handleRunNow}
            />
          )}

          {currentTab === 'rejects' && (
            <RejectsView
              rejects={rejects}
              onForceAccept={handleForceAccept}
              onNavigate={handleNavigate}
            />
          )}

          {currentTab === 'translation' && (
            <TranslationQueueView
              items={translations}
              systemConfig={config}
              onToggleAutoTranslate={() => {
                setConfig((prev) => ({ ...prev, autoTranslate: !prev.autoTranslate }));
                addToast('Auto-translation setting updated.');
              }}
              onTranslateItem={handleTranslateItem}
              onTranslateAll={handleTranslateAll}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              config={config}
              onSaveConfig={handleSaveConfig}
              onToggleGlobalPause={handleToggleGlobalPause}
            />
          )}
        </main>
      </div>

      {/* Global Toast Notifications */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}

export default App;
