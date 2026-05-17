import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Clock, CheckSquare, XCircle, AlertCircle, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import apiClient from '../api/client';

interface Notification {
  id: string;
  notification_type: 'goal_submitted' | 'goal_approved' | 'goal_rework' | 'checkin_reminder' | 'escalation_alert';
  title: string;
  body: string;
  deep_link: string;
  is_read: boolean;
  created_at: string;
}

export const NotificationDropdown: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch notifications initially and then poll every 30 seconds for live updates
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    setIsOpen(false);
    
    // Mark as read in DB if unread
    if (!notif.is_read) {
      try {
        await apiClient.patch(`/notifications/${notif.id}/read`);
        setNotifications(prev => 
          prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
        );
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    // Process deep linking
    if (notif.deep_link) {
      // Determine if deep link is relative (frontend route) or absolute (full URL)
      if (notif.deep_link.startsWith('http://') || notif.deep_link.startsWith('https://')) {
        try {
          const urlObj = new URL(notif.deep_link);
          navigate(urlObj.pathname + urlObj.search);
        } catch {
          window.open(notif.deep_link, '_blank');
        }
      } else {
        navigate(notif.deep_link);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'goal_submitted':
        return <CheckSquare className="w-4 h-4 text-amber-500" />;
      case 'goal_approved':
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case 'goal_rework':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'checkin_reminder':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className={`p-2.5 rounded-xl transition-all relative ${
          isOpen
            ? 'bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-brand-400'
            : 'text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800'
        }`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-500 border-2 border-white dark:border-slate-900 text-[8px] font-extrabold text-white items-center justify-center">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Glassmorphism Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 rounded-2xl overflow-hidden shadow-2xl border border-slate-200/90 dark:border-slate-800/95 bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl z-[70] transform origin-top-right transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 text-[10px] font-extrabold">
                  {unreadCount} New
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1 hover:underline transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List Area */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
            {loading && notifications.length === 0 ? (
              <div className="p-10 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Syncing Alerts...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-600 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900/40 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All caught up!</p>
                  <p className="text-xs mt-1">No unread notifications at the moment.</p>
                </div>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`px-5 py-4 flex gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-900/40 cursor-pointer transition-colors relative group ${
                    !notif.is_read ? 'bg-brand-50/20 dark:bg-brand-950/5' : ''
                  }`}
                >
                  {/* Status Indicator */}
                  {!notif.is_read && (
                    <span className="absolute top-4 left-2 w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                  )}

                  {/* Icon */}
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-center shrink-0">
                    {getIcon(notif.notification_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className={`text-xs leading-snug truncate ${
                        !notif.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'
                      }`}>
                        {notif.title}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-tighter shrink-0 mt-0.5">
                        {formatTime(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                    {notif.deep_link && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Go to view</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
