import React, { useState, useEffect } from 'react';
import { BookOpen, ArrowLeft, Type, Clock, AlignLeft, RotateCw } from 'lucide-react';

interface BrowserOsReaderProps {
  url: string;
  onExitReader: () => void;
}

export const BrowserOsReader: React.FC<BrowserOsReaderProps> = ({ url, onExitReader }) => {
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<any>(null);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');

  useEffect(() => {
    let isMounted = true;
    const fetchReader = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/browser/reader?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (isMounted) setArticle(data);
      } catch {
        if (isMounted) setArticle(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchReader();
    return () => {
      isMounted = false;
    };
  }, [url]);

  const readingTimeMin = Math.ceil((article?.wordCount || 300) / 200);

  const fontClass =
    fontSize === 'normal'
      ? 'text-base leading-relaxed'
      : fontSize === 'large'
      ? 'text-lg leading-loose'
      : 'text-xl leading-loose';

  return (
    <div className="flex-1 flex flex-col bg-[#071317] text-zinc-200 overflow-y-auto select-text">
      {/* Reader Control Bar */}
      <div className="sticky top-0 bg-[#040e11]/90 backdrop-blur-md border-b border-[#122e36] px-6 py-2.5 flex items-center justify-between z-20">
        <button
          onClick={onExitReader}
          className="px-3 py-1.5 rounded-xl bg-[#0c242b] hover:bg-[#143e47] text-[#48e4ff] text-xs font-bold flex items-center gap-1.5 transition"
        >
          <ArrowLeft size={13} />
          <span>Exit Reader Mode</span>
        </button>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-[#48e4ff]" />
            <span>{readingTimeMin} min read</span>
          </div>

          <div className="flex items-center gap-1 bg-[#091e24] p-1 rounded-lg border border-[#133c46]">
            <Type size={12} className="text-zinc-500 ml-1 mr-0.5" />
            <button
              onClick={() => setFontSize('normal')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                fontSize === 'normal' ? 'bg-[#143e47] text-[#48e4ff]' : 'text-zinc-400'
              }`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                fontSize === 'large' ? 'bg-[#143e47] text-[#48e4ff]' : 'text-zinc-400'
              }`}
            >
              A+
            </button>
            <button
              onClick={() => setFontSize('xlarge')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                fontSize === 'xlarge' ? 'bg-[#143e47] text-[#48e4ff]' : 'text-zinc-400'
              }`}
            >
              A++
            </button>
          </div>
        </div>
      </div>

      {/* Reader Content Body */}
      <div className="max-w-3xl mx-auto w-full px-6 py-10 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400 space-y-3">
            <RotateCw size={24} className="animate-spin text-[#48e4ff]" />
            <p className="text-xs font-mono">Extracting article readability canvas...</p>
          </div>
        ) : article ? (
          <>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight leading-tight">
              {article.title}
            </h1>

            <div className="text-xs font-mono text-[#48e4ff] break-all border-b border-[#12313a] pb-4">
              {article.url}
            </div>

            {article.leadImage && (
              <div className="rounded-2xl overflow-hidden border border-[#133a44] my-6">
                <img
                  src={`/api/proxy?url=${encodeURIComponent(article.leadImage)}`}
                  alt={article.title}
                  className="w-full max-h-96 object-cover"
                />
              </div>
            )}

            <div className={`space-y-5 font-serif text-zinc-300 ${fontClass}`}>
              {(article.paragraphs || []).map((p: string, idx: number) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-zinc-400 text-sm">
            Could not parse article content for this page.
          </div>
        )}
      </div>
    </div>
  );
};
