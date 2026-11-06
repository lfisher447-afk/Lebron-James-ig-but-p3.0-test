import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  Lock,
  KeyRound,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Database,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { startNovaAcWorker } from '../lib/novaac';
import { saveTracksBatch, savePlaylist } from '../lib/db';
import { Track } from '../types';

interface NovaAcModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const NovaAcModal: React.FC<NovaAcModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [profile, setProfile] = useState<'safe' | 'balanced' | 'turbo'>('turbo');
  const [isProcessing, setIsProcessing] = useState(false);
  const [workerInstance, setWorkerInstance] = useState<{ stop: () => void } | null>(null);

  // Telemetry state
  const [stage, setStage] = useState<string>('Ready for archive selection.');
  const [progressBytes, setProgressBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [speedBps, setSpeedBps] = useState(0);
  const [etaSecs, setEtaSecs] = useState(0);
  const [collectionTitle, setCollectionTitle] = useState('Default Vault');
  const [importedTracksCount, setImportedTracksCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartImport = () => {
    if (!archiveFile) {
      alert('Please select a valid .novaac archive file.');
      return;
    }
    if (!passphrase.trim()) {
      alert('Please enter your Web Passphrase.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setTotalBytes(archiveFile.size);
    setStage('INITIALIZING STREAM');

    const importedTracks: Track[] = [];

    const instance = startNovaAcWorker(archiveFile, passphrase, profile, async (msg) => {
      if (msg.type === 'pulse') {
        setStage(msg.stage || 'DECRYPTING');
        if (msg.frame !== undefined) setCurrentFrame(msg.frame);
      } else if (msg.type === 'progress') {
        setProgressBytes(msg.bytes);
        setTotalBytes(msg.total);
        if (msg.frames !== undefined) setCurrentFrame(msg.frames);
        if (msg.bps !== undefined) setSpeedBps(msg.bps);
        if (msg.eta !== undefined) setEtaSecs(msg.eta);
        if (msg.collection) setCollectionTitle(msg.collection);
      } else if (msg.type === 'batch') {
        // Save progressive chunk batch directly to IndexedDB
        if (msg.tracks && Array.isArray(msg.tracks)) {
          await saveTracksBatch(msg.tracks);
          importedTracks.push(...msg.tracks);
          setImportedTracksCount((c) => c + msg.tracks.length);
        }
        // Send ACK back to worker
        (instance.worker as any).postMessage({ type: 'ack', batchId: msg.batchId });
      } else if (msg.type === 'complete') {
        setIsProcessing(false);
        setStage('COMPLETE');
        setImportedTracksCount(msg.tracks);

        // Save Collection Playlist
        if (importedTracks.length > 0) {
          await savePlaylist({
            id: `novaac_${Date.now()}`,
            name: msg.collection || 'NovaAc Vault Collection',
            source: 'local',
            trackIds: importedTracks.map((t) => t.id),
            createdAt: Date.now(),
          });
        }

        onImportComplete();
        alert(`NovaAc Import Complete! Successfully decrypted and mounted ${msg.tracks} tracks.`);
        onClose();
      } else if (msg.type === 'error') {
        setIsProcessing(false);
        setErrorMessage(msg.message || 'Decryption failed.');
        setStage('ERROR');
      }
    });

    setWorkerInstance(instance);
  };

  const handleCancel = () => {
    if (workerInstance) {
      workerInstance.stop();
      setWorkerInstance(null);
    }
    setIsProcessing(false);
    setStage('CANCELLED');
  };

  const percent = totalBytes > 0 ? ((progressBytes / totalBytes) * 100).toFixed(1) : '0';
  const speedMb = (speedBps / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 select-none animate-in fade-in duration-200">
      <div className="bg-[#09171b] border border-[#234b54] rounded-3xl w-full max-w-2xl p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Ambient emerald glow */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-[#34d399]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#065f46]/40 to-[#04281e] border border-[#34d399]/30 flex items-center justify-center text-[#34d399] shadow-lg">
              <UploadCloud size={22} className={isProcessing ? 'animate-bounce' : ''} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
                NovaAc Framed Archive Deck
              </h2>
              <p className="text-xs text-[#8aaeb5]">
                AES-256-GCM / PBKDF2 progressive stream decompression & IndexedDB vault commit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#0e242a] text-[#789d9a] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* File & Passphrase Inputs */}
        <div className="space-y-4 mb-6">
          {/* File Picker */}
          <div className="border border-dashed border-[#234b54] bg-[#061013] hover:border-[#34d399]/60 p-5 rounded-2xl transition-colors text-center cursor-pointer relative">
            <input
              type="file"
              accept=".novaac"
              onChange={(e) => setArchiveFile(e.target.files?.[0] || null)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center">
              <UploadCloud size={28} className="text-[#34d399] mb-2" />
              <div className="text-sm font-bold text-white">
                {archiveFile ? archiveFile.name : 'Choose .novaac Archive'}
              </div>
              <div className="text-xs text-[#789d9a] mt-0.5">
                {archiveFile
                  ? `${(archiveFile.size / (1024 * 1024)).toFixed(2)} MB • Ready`
                  : 'Drag and drop or click to browse'}
              </div>
            </div>
          </div>

          {/* Passphrase Input */}
          <div className="relative">
            <KeyRound size={16} className="absolute left-4 top-3.5 text-[#789d9a]" />
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter Archive Web Passphrase..."
              className="w-full bg-[#061013] border border-[#1a3840] text-white rounded-xl pl-11 pr-4 py-3 outline-none focus:border-[#34d399] text-xs font-mono transition-colors"
            />
          </div>

          {/* Profile Selector */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'safe', label: 'Safe (1MB)', desc: 'Low RAM' },
              { id: 'balanced', label: 'Balanced (4MB)', desc: 'Standard' },
              { id: 'turbo', label: 'Turbo (16MB)', desc: 'Fastest' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setProfile(p.id as any)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  profile === p.id
                    ? 'bg-[#0e2d26] border-[#34d399]/50 text-white shadow-sm'
                    : 'bg-[#061013] border-[#1a3840] text-[#789d9a] hover:text-white'
                }`}
              >
                <div className="text-xs font-bold">{p.label}</div>
                <div className="text-[10px] text-[#527e74] mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Telemetry Display */}
        <div className="p-4 rounded-2xl bg-[#061013] border border-[#1a3840] mb-6 font-mono text-xs">
          <div className="flex items-center justify-between text-[#8aaeb5] mb-2">
            <span className="flex items-center gap-2">
              <Activity size={14} className="text-[#34d399]" />
              <span>STAGE: <strong className="text-white">{stage}</strong></span>
            </span>
            <span className="text-[#34d399] font-bold">{percent}%</span>
          </div>

          <div className="w-full h-2 bg-[#0e242a] rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-[#34d399] to-[#48e4ff] transition-all duration-150"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] text-[#5c828a] pt-1 border-t border-[#12282e]">
            <div>Frame: <span className="text-white">#{currentFrame}</span></div>
            <div>Speed: <span className="text-white">{speedMb} MB/s</span></div>
            <div>Tracks: <span className="text-white">{importedTracksCount}</span></div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#ef4444] text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-between pt-4 border-t border-[#1a3840]">
          <div className="flex items-center gap-2 text-xs text-[#789d9a]">
            <ShieldCheck size={16} className="text-[#34d399]" />
            <span>Hardware PBKDF2 WebCrypto Engine</span>
          </div>

          {isProcessing ? (
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] border border-[#ef4444]/40 font-bold rounded-xl text-xs transition-colors"
            >
              Cancel Decryption
            </button>
          ) : (
            <button
              onClick={handleStartImport}
              className="px-6 py-2.5 bg-[#34d399] text-[#051a20] font-bold rounded-xl text-xs hover:bg-[#8df5be] transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)]"
            >
              Unlock & Restore Vault
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
