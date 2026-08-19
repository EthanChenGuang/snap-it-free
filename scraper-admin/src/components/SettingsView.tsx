import React, { useState } from 'react';
import {
  Power,
  Network,
  Bell,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { SystemConfig } from '../types';

interface SettingsViewProps {
  config: SystemConfig;
  onSaveConfig: (newConfig: SystemConfig) => void;
  onToggleGlobalPause: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onSaveConfig,
  onToggleGlobalPause,
}) => {
  const [proxyUrl, setProxyUrl] = useState(config.proxyUrl);
  const [showProxyPassword, setShowProxyPassword] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState(config.telegramChatId);
  const [alertEmailTo, setAlertEmailTo] = useState(config.alertEmailTo);

  const handleSaveProxy = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({ ...config, proxyUrl });
  };

  const handleSaveAlerts = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({ ...config, telegramChatId, alertEmailTo });
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 font-sans text-[#37352f]">
      {/* Notion Page Icon & Header */}
      <div className="space-y-2 border-b border-[#e9e9e8] pb-6">
        <div className="text-4xl select-none leading-none">⚙️</div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#37352f]">
            System Parameters
          </h1>
          <p className="text-xs text-[#787774] mt-1.5 leading-relaxed">
            Core operational controls, proxy tunnel gateways, and alert routing channels.
          </p>
        </div>
      </div>

      {/* Global Engine Pause Card */}
      <div className="rounded-md border border-[#e9e9e8] bg-white p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded ${config.globalPause ? 'bg-[#ffe2dd] text-[#5d1715]' : 'bg-[#e6f4ea] text-[#137333]'}`}>
              <Power className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#37352f]">Global Engine Pause</h3>
                {config.globalPause ? (
                  <span className="inline-flex items-center rounded bg-[#ffe2dd] px-2 py-0.5 text-xs font-semibold text-[#5d1715] border border-[#f5c6cb]">
                    PAUSED
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded bg-[#e6f4ea] px-2 py-0.5 text-xs font-semibold text-[#137333] border border-[#ceead6]">
                    RUNNING
                  </span>
                )}
              </div>
              <p className="text-xs text-[#787774] mt-1 max-w-lg leading-relaxed">
                Halt all background worker scraping threads immediately across all target sources.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.globalPause}
              onChange={onToggleGlobalPause}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-[#e3e2e0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
      </div>

      {/* Proxy Tunnel Configuration Card */}
      <div className="rounded-md border border-[#e9e9e8] bg-white p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#e9e9e8] pb-3">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-[#37352f]" />
            <h3 className="text-sm font-bold text-[#37352f]">Proxy Gateway Pool</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded bg-[#e6f4ea] px-2 py-0.5 text-xs font-semibold text-[#137333]">
            Active
          </span>
        </div>

        <form onSubmit={handleSaveProxy} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-[#37352f] mb-1">
              Residential Gateway URL
            </label>
            <div className="relative">
              <input
                type={showProxyPassword ? 'text' : 'password'}
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                className="w-full rounded-md border border-[#e9e9e8] p-2 pr-10 font-mono text-xs text-[#37352f] bg-[#f7f6f3] focus:border-[#37352f] focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowProxyPassword(!showProxyPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787774] hover:text-[#37352f] cursor-pointer"
              >
                {showProxyPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-[#787774] mt-1 font-mono">
              Format: http://user:pass@proxy.datacenter.com:8080
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md bg-[#37352f] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black transition-colors cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Proxy Pool</span>
            </button>
          </div>
        </form>
      </div>

      {/* Alert Routing Card */}
      <div className="rounded-md border border-[#e9e9e8] bg-white p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#e9e9e8] pb-3">
          <Bell className="h-4 w-4 text-[#37352f]" />
          <h3 className="text-sm font-bold text-[#37352f]">Alert Routing Channels</h3>
        </div>

        <form onSubmit={handleSaveAlerts} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#37352f] mb-1">
                Telegram Chat ID
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full rounded-md border border-[#e9e9e8] p-2 font-mono text-xs text-[#37352f] bg-[#f7f6f3] focus:border-[#37352f] focus:bg-white focus:outline-none"
                placeholder="-1001234567890"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#37352f] mb-1">
                Alert Email Recipient
              </label>
              <input
                type="email"
                value={alertEmailTo}
                onChange={(e) => setAlertEmailTo(e.target.value)}
                className="w-full rounded-md border border-[#e9e9e8] p-2 font-mono text-xs text-[#37352f] bg-[#f7f6f3] focus:border-[#37352f] focus:bg-white focus:outline-none"
                placeholder="admin@domain.com"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-[#787774]">
              SMTP & bot tokens managed via secure environment secrets.
            </p>

            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md bg-[#37352f] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black transition-colors cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Alert Channels</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

