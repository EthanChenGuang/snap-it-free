import React, { useState } from 'react';
import { AppSettings, Zone } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  zones: Zone[];
  onToggleZoneStatus: (zoneId: string) => void;
  onDeleteZone: (zoneId: string) => void;
  onAddZone: (name: string, description: string) => void;
  onResetAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  zones,
  onToggleZoneStatus,
  onDeleteZone,
  onAddZone,
  onResetAllData,
}) => {
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneDesc, setNewZoneDesc] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLanguageChange = (lang: 'zh' | 'en' | 'it') => {
    onUpdateSettings({ ...settings, language: lang });
  };

  const handleAddZoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;
    onAddZone(newZoneName.trim(), newZoneDesc.trim() || 'Custom monitoring zone');
    setNewZoneName('');
    setNewZoneDesc('');
    setShowAddZoneModal(false);
  };

  return (
    <main className="max-w-[800px] mx-auto px-4 py-6 mb-32">
      {/* Workspace Breadcrumbs Header */}
      <div className="mb-6 flex items-center space-x-2 text-xs text-[#91918e] border-b border-[#ececec] pb-3">
        <span className="hover:text-[#37352f] cursor-pointer">Workspace</span>
        <span>/</span>
        <span className="font-semibold text-[#37352f]">⚙️ Settings & Zones</span>
      </div>

      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#37352f] tracking-tight mb-1">Settings</h2>
        <p className="text-xs text-[#91918e]">
          Manage your account preferences, notifications, and monitoring zones.
        </p>
      </div>

      {/* General Section */}
      <section className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#91918e] mb-2">
          General
        </h3>
        <div className="rounded-md overflow-hidden border border-[#ececec] bg-white">
          <div
            onClick={() => setShowProfileModal(true)}
            className="flex items-center justify-between p-3 border-b border-[#ececec] hover:bg-[#efefed]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#91918e] text-base">person</span>
              <span className="text-xs font-semibold text-[#37352f]">Profile Information</span>
            </div>
            <span className="material-symbols-outlined text-[#91918e] text-base">chevron_right</span>
          </div>

          <div
            onClick={() => {
              const nextAppearance =
                settings.appearance === 'System default'
                  ? 'Light'
                  : settings.appearance === 'Light'
                  ? 'Dark'
                  : 'System default';
              onUpdateSettings({ ...settings, appearance: nextAppearance });
            }}
            className="flex items-center justify-between p-3 hover:bg-[#efefed]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#91918e] text-base">dark_mode</span>
              <span className="text-xs font-semibold text-[#37352f]">Appearance</span>
            </div>
            <span className="text-xs font-semibold text-[#91918e]">{settings.appearance}</span>
          </div>
        </div>
      </section>

      {/* Alerts & Notifications */}
      <section className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#91918e] mb-2">
          Alerts & Notifications
        </h3>
        <div className="rounded-md overflow-hidden border border-[#ececec] bg-white">
          <div className="flex items-center justify-between p-3 border-b border-[#ececec]">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#37352f]">Push Notifications</span>
              <span className="text-[11px] text-[#91918e]">
                Receive real-time alerts for new drops
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.pushNotifications}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, pushNotifications: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#ececec] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#37352f]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#37352f]">Sound Alerts</span>
              <span className="text-[11px] text-[#91918e]">
                Play distinctive chime for priority zones
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.soundAlerts}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, soundAlerts: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#ececec] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#37352f]"></div>
            </label>
          </div>
        </div>
      </section>

      {/* Zones Management */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#91918e]">
            Zones Management
          </h3>
          <button
            onClick={() => setShowAddZoneModal(true)}
            className="text-xs text-[#37352f] flex items-center gap-1 hover:underline cursor-pointer font-bold"
          >
            <span className="material-symbols-outlined text-[14px]">add</span> Add Zone
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="rounded-md p-3 flex flex-col justify-between gap-2 relative border border-[#ececec] bg-white"
            >
              <div className="flex justify-between items-start">
                <div className="w-9 h-9 bg-[#fbfbfa] rounded border border-[#ececec] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#37352f] text-base">{zone.icon}</span>
                </div>
                <button
                  onClick={() => onDeleteZone(zone.id)}
                  className="text-[#91918e] hover:text-red-600 transition-colors cursor-pointer p-1"
                  title="Remove zone"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#37352f]">{zone.name}</h4>
                <p className="text-[11px] text-[#91918e]">{zone.description}</p>
              </div>

              <div className="mt-1 flex items-center justify-between border-t border-[#ececec] pt-2">
                <button
                  onClick={() => onToggleZoneStatus(zone.id)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider cursor-pointer ${
                    zone.status === 'ACTIVE'
                      ? 'bg-[#fff5eb] text-[#df6b05] border border-[#fde3cf]'
                      : 'bg-[#efefed] text-[#91918e]'
                  }`}
                >
                  {zone.status}
                </button>
                <span className="text-[10px] text-[#91918e]">{zone.lastUpdated}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Language Selection */}
      <section className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#91918e] mb-2">
          Language
        </h3>
        <div className="rounded-md p-3 flex flex-wrap gap-3 border border-[#ececec] bg-white">
          <button
            type="button"
            onClick={() => handleLanguageChange('zh')}
            className={`flex-1 min-w-[100px] p-2.5 rounded text-center flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              settings.language === 'zh'
                ? 'border border-[#37352f] bg-[#37352f] text-white'
                : 'border border-[#ececec] hover:border-[#37352f] text-[#37352f]'
            }`}
          >
            <span className="text-xs font-bold">中文</span>
            <span className="text-[10px] uppercase font-medium opacity-80">Chinese</span>
          </button>

          <button
            type="button"
            onClick={() => handleLanguageChange('en')}
            className={`flex-1 min-w-[100px] p-2.5 rounded text-center flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              settings.language === 'en'
                ? 'border border-[#37352f] bg-[#37352f] text-white'
                : 'border border-[#ececec] hover:border-[#37352f] text-[#37352f]'
            }`}
          >
            <span className="text-xs font-bold">English</span>
            <span className="text-[10px] uppercase font-medium opacity-80">English</span>
          </button>

          <button
            type="button"
            onClick={() => handleLanguageChange('it')}
            className={`flex-1 min-w-[100px] p-2.5 rounded text-center flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              settings.language === 'it'
                ? 'border border-[#37352f] bg-[#37352f] text-white'
                : 'border border-[#ececec] hover:border-[#37352f] text-[#37352f]'
            }`}
          >
            <span className="text-xs font-bold">Italiano</span>
            <span className="text-[10px] uppercase font-medium opacity-80">Italian</span>
          </button>
        </div>
      </section>

      {/* Advanced / Danger Zone */}
      <section className="pb-6">
        <div className="rounded-md p-3 bg-red-50/50 border border-red-200">
          <h4 className="text-xs font-bold text-red-700 mb-1">Advanced</h4>
          <p className="text-[11px] text-[#91918e] mb-3">
            Permanently clear local cache and restore sample items.
          </p>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset all cache and data?')) {
                onResetAllData();
              }
            }}
            className="bg-white border border-red-300 text-red-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-600 hover:text-white transition-all cursor-pointer"
          >
            Reset Cache & Data
          </button>
        </div>
      </section>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-[#ececec] p-5 max-w-sm w-full shadow-lg">
            <h3 className="text-sm font-bold mb-3 text-[#37352f]">Profile Information</h3>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-[#fbfbfa] flex items-center justify-center overflow-hidden border border-[#ececec]">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-bold text-xs text-[#37352f]">Community Member</p>
                <p className="text-[11px] text-[#91918e]">ethan.chen.guang@gmail.com</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold rounded">
                  Verified Member
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowProfileModal(false)}
              className="w-full py-2 bg-[#37352f] text-white text-xs font-bold rounded cursor-pointer hover:bg-black"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Add Zone Modal */}
      {showAddZoneModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddZoneSubmit}
            className="bg-white rounded-md border border-[#ececec] p-5 max-w-sm w-full shadow-lg space-y-3"
          >
            <h3 className="text-sm font-bold text-[#37352f]">Add Monitoring Zone</h3>
            <div>
              <label className="block text-xs font-semibold text-[#91918e] mb-1">Zone Name</label>
              <input
                type="text"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="e.g. Jing'an District or Tokyo Central"
                className="w-full p-2 border border-[#ececec] rounded text-xs text-[#37352f] focus:border-[#37352f] outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#91918e] mb-1">Description / Scope</label>
              <input
                type="text"
                value={newZoneDesc}
                onChange={(e) => setNewZoneDesc(e.target.value)}
                placeholder="e.g. Vintage furniture and art drops"
                className="w-full p-2 border border-[#ececec] rounded text-xs text-[#37352f] focus:border-[#37352f] outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddZoneModal(false)}
                className="flex-1 py-1.5 border border-[#ececec] rounded text-xs font-semibold text-[#37352f] cursor-pointer hover:bg-[#efefed]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-1.5 bg-[#37352f] text-white rounded text-xs font-semibold cursor-pointer hover:bg-black"
              >
                Create Zone
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
};
