import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Stethoscope, Pill, Bed, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';

export default function GlobalSearchModal({ isOpen, onClose, onSelectResult }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ patients: [], doctors: [], medications: [], beds: [] });
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ patients: [], doctors: [], medications: [], beds: [] });
    }
  }, [isOpen]);

  // Global keydown listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(false, true); // Trigger open
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ patients: [], doctors: [], medications: [], beds: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query.trim())}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || { patients: [], doctors: [], medications: [], beds: [] });
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, token]);

  if (!isOpen) return null;

  const totalResults =
    (results.patients?.length || 0) +
    (results.doctors?.length || 0) +
    (results.medications?.length || 0) +
    (results.beds?.length || 0);

  const renderSection = (title, items, Icon, badgeColor) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Icon className="w-3.5 h-3.5" />
          <span>{title}</span>
        </div>
        <div className="space-y-1 mt-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (onSelectResult) onSelectResult(item);
                onClose();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${badgeColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients, doctors, medications, beds... (Type 2+ letters)"
            className="flex-1 bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-base"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
          {loading && (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Searching hospital records...
            </div>
          )}

          {!loading && query && totalResults === 0 && (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No matching hospital records found for "{query}".
            </div>
          )}

          {!loading && !query && (
            <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              Type to quickly find patients, medical personnel, inventory pharmaceuticals, or hospital wards.
            </div>
          )}

          {!loading && (
            <>
              {renderSection('Patients', results.patients, User, 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300')}
              {renderSection('Physicians & Doctors', results.doctors, Stethoscope, 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300')}
              {renderSection('Pharmacy Inventory', results.medications, Pill, 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300')}
              {renderSection('Wards & Beds', results.beds, Bed, 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300')}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Global Clinical Search</span>
          <div className="flex items-center gap-2">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded shadow-xs">ESC</kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
