import React, { useEffect, useState } from 'react';
import { Shield, Bell, CheckCircle2, AlertTriangle, X, Info, ShieldAlert } from 'lucide-react';
import { AppNotification, subscribeNotifications, clearNotifications } from '../lib/notifications';

export function NotificationToast() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    return subscribeNotifications((list) => {
      setNotifications(list);
    });
  }, []);

  const latestNotif = notifications[0];

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[2147483645] max-w-sm w-full space-y-2 pointer-events-auto">
      {/* Latest Floating Toast Banner */}
      {latestNotif && (
        <div className="p-3.5 rounded-2xl bg-[#061013]/95 backdrop-blur-md border border-[#1a3840] shadow-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
          <div className="p-2 rounded-xl bg-[#0e272f] border border-[#235360] text-[#48e4ff] shrink-0">
            {latestNotif.type === 'security' && <ShieldAlert size={18} className="text-[#ef4444]" />}
            {latestNotif.type === 'success' && <CheckCircle2 size={18} className="text-[#34d399]" />}
            {latestNotif.type === 'warning' && <AlertTriangle size={18} className="text-[#fbbf24]" />}
            {latestNotif.type === 'error' && <AlertTriangle size={18} className="text-[#f87171]" />}
            {latestNotif.type === 'info' && <Bell size={18} className="text-[#38bdf8]" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-xs text-white truncate">{latestNotif.title}</span>
              <span className="text-[9px] font-mono text-[#789d9a]">
                {new Date(latestNotif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-[11px] text-[#8aaeb5] mt-0.5 line-clamp-2">{latestNotif.message}</p>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-[#789d9a] hover:text-white text-[10px] font-mono px-2 py-1 rounded-lg bg-[#0e2227] hover:bg-[#16363d] shrink-0"
          >
            {isOpen ? 'Close' : `All (${notifications.length})`}
          </button>
        </div>
      )}

      {/* Expanded Notifications History Panel */}
      {isOpen && (
        <div className="p-4 rounded-2xl bg-[#040a0c]/98 backdrop-blur-xl border border-[#1a3840] shadow-2xl max-h-80 overflow-y-auto space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#12282e]">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-[#48e4ff]" />
              <span className="font-bold text-xs text-white">System Logs & Notifications</span>
            </div>
            <button
              onClick={clearNotifications}
              className="text-[10px] font-mono text-[#ef4444] hover:underline"
            >
              Clear All
            </button>
          </div>

          {notifications.map((n) => (
            <div key={n.id} className="p-2.5 rounded-xl bg-[#08161a] border border-[#142e34] text-xs">
              <div className="flex items-center justify-between font-bold text-white mb-0.5">
                <span>{n.title}</span>
                <span className="text-[9px] font-mono text-[#789d9a]">
                  {new Date(n.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-[10px] text-[#789d9a]">{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
