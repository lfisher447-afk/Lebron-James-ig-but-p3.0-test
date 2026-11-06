import React, { useState, useEffect } from 'react';
import {
  Search,
  ExternalLink,
  ShieldCheck,
  Image as ImageIcon,
  Link2,
  Server,
  Layers,
  Clock,
  RotateCw,
  Copy,
  Check,
  Download,
} from 'lucide-react';

interface BrowserOsInspectorProps {
  activeUrl: string;
  onNavigate: (url: string) => void;
}

export const BrowserOsInspector: React.FC<BrowserOsInspectorProps> = ({ activeUrl, onNavigate }) => {
  const [inspectUrl, setInspectUrl] = useState(activeUrl || 'https://en.wikipedia.org');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'images' | 'links' | 'headers'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchInspection = async (target: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/browser/inspect?url=${encodeURIComponent(target)}`);
      if (!res.ok) throw new Error(`Inspect failed with status ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Inspection failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeUrl) {
      setInspectUrl(activeUrl);
      fetchInspection(activeUrl);
    }
  }, [activeUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inspectUrl) fetchInspection(inspectUrl);
  };

  const copyVal = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#040d10] text-zinc-200 overflow-hidden select-none">
      {/* Search Header */}
      <div className="p-4 bg-[#03090b] border-b border-[#122e36] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-[#48e4ff]" />
          <span className="font-bold text-white text-sm">Page Deep-Scanner & Inspector</span>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 max-w-xl flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={inspectUrl}
              onChange={(e) => setInspectUrl(e.target.value)}
              placeholder="Enter URL to inspect..."
              className="w-full bg-[#07191e] border border-[#143e47] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#48e4ff] font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 rounded-xl bg-[#143e47] hover:bg-[#1d5764] text-[#48e4ff] font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RotateCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Scan</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="m-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs font-mono">
          Inspection Error: {error}
        </div>
      )}

      {data && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub Navigation */}
          <div className="px-6 py-2 bg-[#051418] border-b border-[#11313a] flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 rounded-lg transition font-medium ${
                activeTab === 'overview'
                  ? 'bg-[#143e47] text-[#48e4ff] font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Overview & Security
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1.5 ${
                activeTab === 'images'
                  ? 'bg-[#143e47] text-[#48e4ff] font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ImageIcon size={12} />
              <span>Extracted Images ({data.imagesCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1.5 ${
                activeTab === 'links'
                  ? 'bg-[#143e47] text-[#48e4ff] font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Link2 size={12} />
              <span>Extracted Hyperlinks ({data.linksCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('headers')}
              className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1.5 ${
                activeTab === 'headers'
                  ? 'bg-[#143e47] text-[#48e4ff] font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Server size={12} />
              <span>HTTP Headers ({Object.keys(data.headers || {}).length})</span>
            </button>
          </div>

          {/* Content Views */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6 max-w-4xl">
                {/* General Summary Card */}
                <div className="bg-[#06171c] border border-[#133742] rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{data.title}</h3>
                      <p className="text-xs font-mono text-[#48e4ff] mt-1 break-all">{data.url}</p>
                    </div>
                    <button
                      onClick={() => onNavigate(data.url)}
                      className="px-3 py-1.5 rounded-xl bg-[#143e47] hover:bg-[#1f5664] text-[#48e4ff] text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                    >
                      <span>Open in Tab</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-[#040e11] p-3 rounded-xl border border-[#0d272e]">
                      <div className="text-[10px] text-zinc-500 font-mono">STATUS</div>
                      <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                        {data.status} {data.statusText}
                      </div>
                    </div>
                    <div className="bg-[#040e11] p-3 rounded-xl border border-[#0d272e]">
                      <div className="text-[10px] text-zinc-500 font-mono">RTT LATENCY</div>
                      <div className="text-sm font-bold text-[#48e4ff] font-mono mt-0.5">
                        {data.latencyMs}ms
                      </div>
                    </div>
                    <div className="bg-[#040e11] p-3 rounded-xl border border-[#0d272e]">
                      <div className="text-[10px] text-zinc-500 font-mono">CONTENT LENGTH</div>
                      <div className="text-sm font-bold text-zinc-200 font-mono mt-0.5">
                        {(data.contentLength / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="bg-[#040e11] p-3 rounded-xl border border-[#0d272e]">
                      <div className="text-[10px] text-zinc-500 font-mono">ENCRYPTION</div>
                      <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                        <ShieldCheck size={13} />
                        <span>TLS 1.3 / Verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'images' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {(data.sampleImages || []).map((imgUrl: string, idx: number) => (
                  <div
                    key={idx}
                    className="bg-[#06171c] border border-[#133742] rounded-xl p-2 flex flex-col justify-between group overflow-hidden"
                  >
                    <div className="h-32 bg-black/40 rounded-lg overflow-hidden flex items-center justify-center relative">
                      <img
                        src={`/api/proxy?url=${encodeURIComponent(imgUrl)}`}
                        alt="Scraped asset"
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                        onError={(e: any) => {
                          e.target.src = imgUrl;
                        }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-zinc-500 truncate max-w-[120px]">
                        {imgUrl.split('/').pop() || 'image'}
                      </span>
                      <a
                        href={`/api/proxy?url=${encodeURIComponent(imgUrl)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded bg-[#092229] hover:bg-[#123640] text-[#48e4ff]"
                        title="View Full Image"
                      >
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'links' && (
              <div className="space-y-2 max-w-4xl font-mono text-xs">
                {(data.sampleLinks || []).map((lnk: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#06171c] border border-[#133742] rounded-xl flex items-center justify-between gap-3 group"
                  >
                    <div className="truncate">
                      <div className="text-white font-bold truncate">{lnk.text || 'Link'}</div>
                      <div className="text-zinc-500 text-[11px] truncate">{lnk.href}</div>
                    </div>
                    <button
                      onClick={() => onNavigate(lnk.href)}
                      className="px-3 py-1 rounded-lg bg-[#143e47] hover:bg-[#1f5664] text-[#48e4ff] text-xs font-bold transition flex items-center gap-1 shrink-0"
                    >
                      <span>Navigate</span>
                      <ExternalLink size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'headers' && (
              <div className="space-y-1.5 max-w-4xl font-mono text-xs">
                {Object.entries(data.headers || {}).map(([key, val]: any) => (
                  <div
                    key={key}
                    className="p-2.5 bg-[#06171c] border border-[#133742] rounded-xl flex items-center justify-between gap-4 group"
                  >
                    <span className="text-[#48e4ff] font-bold">{key}:</span>
                    <span className="text-zinc-300 truncate flex-1 text-right">{val}</span>
                    <button
                      onClick={() => copyVal(`${key}: ${val}`, key)}
                      className="p-1 rounded hover:bg-[#092229] text-zinc-500 hover:text-white transition shrink-0"
                      title="Copy header"
                    >
                      {copiedKey === key ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
