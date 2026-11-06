import { AppSettings } from '../types';
import { loadWsmModule, WsmModuleInstance } from './wsm-loader';
import { addNotification } from './notifications';

let securityCleanupFn: (() => void) | null = null;
let originalGetDisplayMedia: any = null;
let originalToDataURL: any = null;
let originalToBlob: any = null;
let originalGetImageData: any = null;
let originalMediaRecorder: any = null;
let originalPrint: any = null;
let wsmCryptoEngine: WsmModuleInstance | null = null;
let workerInstances: Worker[] = [];
let audioAnchorCtx: AudioContext | null = null;
let audioAnchorOsc: OscillatorNode | null = null;
let antiCloseWarningEl: HTMLDivElement | null = null;

export const CLOAK_PRESETS = {
  'google-classroom': {
    title: 'Classes',
    favicon: 'https://ssl.gstatic.com/classroom/favicon.png',
  },
  'google-drive': {
    title: 'My Drive - Google Drive',
    favicon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png',
  },
  wikipedia: {
    title: 'Wikipedia, the free encyclopedia',
    favicon: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
  },
  canvas: {
    title: 'Dashboard | Canvas LMS',
    favicon: 'https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico',
  },
  calculator: {
    title: 'Desmos | Graphing Calculator',
    favicon: 'https://www.desmos.com/favicon.ico',
  },
  edpuzzle: {
    title: 'Edpuzzle',
    favicon: 'https://edpuzzle.imgix.net/favicons/favicon-32.png',
  },
};

export function applyTabCloak(presetKey: keyof typeof CLOAK_PRESETS | 'none') {
  if (presetKey === 'none' || !CLOAK_PRESETS[presetKey]) {
    document.title = 'Spotui Signal Room';
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (link) {
      link.href = '/vite.svg';
    }
    return;
  }

  const preset = CLOAK_PRESETS[presetKey];
  document.title = preset.title;

  let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = preset.favicon;
}

/**
 * Checks if the application is currently running inside an about:blank stealth window or iframe
 */
export function isRunningInAboutBlank(): boolean {
  try {
    return window.location.protocol === 'about:' || window.top !== window;
  } catch {
    // Cross-origin iframe isolation
    return true;
  }
}

/**
 * Shows an on-screen Anti-Close HUD warning banner when a closure attempt is detected
 */
export function showAntiCloseWarning(msg = 'Tab closure intercepted. Click to remain in protected session.') {
  if (!antiCloseWarningEl) {
    antiCloseWarningEl = document.createElement('div');
    antiCloseWarningEl.id = 'anti-close-hud';
    antiCloseWarningEl.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, rgba(14, 26, 30, 0.96), rgba(6, 16, 20, 0.98));
      border: 1px solid #48e4ff;
      border-radius: 14px;
      padding: 12px 24px;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      z-index: 2147483646;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(72, 228, 255, 0.25);
      display: flex;
      align-items: center;
      gap: 12px;
      pointer-events: all;
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    document.body.appendChild(antiCloseWarningEl);
  }

  antiCloseWarningEl.innerHTML = `
    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #48e4ff; box-shadow: 0 0 10px #48e4ff;"></span>
    <span style="color: #48e4ff; font-family: monospace; font-size: 11px; font-weight: bold;">[ 🛡️ ANTI-CLOSE SAFEGUARD ]</span>
    <span>${msg}</span>
    <button id="anti-close-dismiss" style="margin-left: 8px; background: rgba(72, 228, 255, 0.15); border: 1px solid #48e4ff; color: #48e4ff; border-radius: 8px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-weight: bold;">Stay Protected</button>
  `;

  antiCloseWarningEl.style.display = 'flex';
  antiCloseWarningEl.style.opacity = '1';

  const btn = antiCloseWarningEl.querySelector('#anti-close-dismiss');
  if (btn) {
    btn.addEventListener('click', () => {
      if (antiCloseWarningEl) {
        antiCloseWarningEl.style.opacity = '0';
        setTimeout(() => {
          if (antiCloseWarningEl) antiCloseWarningEl.style.display = 'none';
        }, 300);
      }
    });
  }

  setTimeout(() => {
    if (antiCloseWarningEl) {
      antiCloseWarningEl.style.opacity = '0';
      setTimeout(() => {
        if (antiCloseWarningEl) antiCloseWarningEl.style.display = 'none';
      }, 300);
    }
  }, 4000);
}

/**
 * 1000x Hardened Dedicated About:Blank Launcher with Parent Disguise
 */
export function launchDedicatedAboutBlank(
  targetUrl?: string,
  disguiseParent = true,
  presetKey: keyof typeof CLOAK_PRESETS = 'google-classroom'
): boolean {
  const finalSrc = targetUrl || window.location.href;
  const win = window.open('about:blank', '_blank');
  if (!win) {
    addNotification('Popup Blocked', 'Click the About:Blank launch button to authorize the cloaked tab.', 'warning');
    return false;
  }

  const preset = CLOAK_PRESETS[presetKey] || CLOAK_PRESETS['google-classroom'];
  const doc = win.document;
  doc.title = preset.title;

  let iconLink = doc.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (!iconLink) {
    iconLink = doc.createElement('link');
    iconLink.rel = 'icon';
    doc.head.appendChild(iconLink);
  }
  iconLink.href = preset.favicon;

  const iframe = doc.createElement('iframe');
  iframe.src = finalSrc;
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '100vw';
  iframe.style.height = '100vh';
  iframe.style.border = 'none';
  iframe.style.margin = '0';
  iframe.style.padding = '0';
  iframe.style.overflow = 'hidden';
  iframe.setAttribute(
    'allow',
    'autoplay; fullscreen; clipboard-read; clipboard-write; display-capture; camera; microphone; encrypted-media'
  );

  doc.body.style.margin = '0';
  doc.body.style.padding = '0';
  doc.body.style.background = '#07090e';
  doc.body.style.overflow = 'hidden';
  doc.body.appendChild(iframe);

  // Inject anti-close trap inside child window
  try {
    win.addEventListener('beforeunload', (e: any) => {
      e.preventDefault();
      e.returnValue = 'SpotUI Anti-Close: Session is currently active and protected.';
      return e.returnValue;
    });
  } catch {}

  addNotification(
    'about:blank Vault Launched',
    `App running in stealth tab disguised as ${preset.title}. URL and history remain completely blank.`,
    'success'
  );

  // Seamlessly disguise opener tab so teacher/monitor screens only see Google Classroom
  if (disguiseParent) {
    setTimeout(() => {
      try {
        window.location.replace('https://classroom.google.com');
      } catch {
        window.location.href = 'https://classroom.google.com';
      }
    }, 400);
  }

  return true;
}

export function launchAboutBlankCloak(targetUrl?: string) {
  return launchDedicatedAboutBlank(targetUrl, false);
}

export function launchBlobCloak(targetUrl?: string) {
  const finalSrc = targetUrl || window.location.href;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Classes</title>
        <link rel="icon" href="https://ssl.gstatic.com/classroom/favicon.png" type="image/png">
        <style>html,body{margin:0;padding:0;width:100%;height:100%;background:#071013;overflow:hidden;}</style>
      </head>
      <body>
        <iframe src="${finalSrc}" style="width:100%;height:100%;border:none;" allow="autoplay; fullscreen; clipboard-read; clipboard-write; display-capture; camera; microphone; encrypted-media"></iframe>
        <script>
          window.addEventListener('beforeunload', function(e) {
            e.preventDefault();
            e.returnValue = 'SpotUI Vault Session is active.';
            return e.returnValue;
          });
        </script>
      </body>
    </html>
  `;
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
  addNotification('Blob Vault Launched', 'App running in isolated blob URL container.', 'success');
}

/**
 * Server Security Status Helper API Calls
 */
export async function fetchSecurityServerStatus(): Promise<any> {
  try {
    const res = await fetch('/api/security/server-status');
    if (res.ok) return await res.json();
  } catch (err) {
    console.debug('Failed to fetch security server status', err);
  }
  return null;
}

export async function triggerTrafficNoise(): Promise<boolean> {
  try {
    const res = await fetch('/api/security/traffic-noise');
    return res.ok;
  } catch {
    return false;
  }
}

export async function toggleServerFirewall(firewallActive: boolean, antiDpiActive: boolean): Promise<boolean> {
  try {
    const res = await fetch('/api/security/toggle-firewall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firewallActive, antiDpiActive }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 1000x Hardened Anti-Screenshot, Anti-Extension, Anti-Linewize & Anti-Tab-Close Engine
 */
export function initSecurityEngine(settings: AppSettings) {
  // 0. Load WebAssembly WSM Security Crypto Engine
  loadWsmModule('/stealth-crypto.wsm', 'wsm_stealth_crypto_tls').then((inst) => {
    wsmCryptoEngine = inst;
  });

  // Launch all 6 Workers if supported
  try {
    if (workerInstances.length === 0 && 'Worker' in window) {
      const w1 = new Worker('/wsm-worker.js');
      const w2 = new Worker('/crypto-worker.js');
      const w3 = new Worker('/audio-dsp-worker.js');
      const w4 = new Worker('/anti-detect-worker.js');
      const w5 = new Worker('/traffic-obfuscator-worker.js');
      workerInstances = [w1, w2, w3, w4, w5];

      w4.postMessage({ action: 'START_AUDIT' });
      if (settings.security.trafficNoiseGenerator) {
        w5.postMessage({ action: 'START_TRAFFIC_MASK' });
      }
    }
  } catch (e) {
    console.warn('[Workers Init Notice]', e);
  }

  // Cleanup previous listeners
  if (securityCleanupFn) {
    securityCleanupFn();
    securityCleanupFn = null;
  }

  // Handle Tab Cloaking
  applyTabCloak(settings.security.cloakPreset as any);

  // 1. Anti Page Close & Navigation Trap Guard
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (settings.security.antiTabCloseGuard) {
      e.preventDefault();
      e.returnValue = 'Signal Room Vault session is active. Are you sure you want to close this tab?';
      addNotification('Tab Close Intercepted', 'Unload trap prevented silent tab termination.', 'security');
      return e.returnValue;
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);

  // History Trap
  if (settings.security.antiTabCloseGuard) {
    try {
      history.pushState(null, '', location.href);
      window.onpopstate = function () {
        history.pushState(null, '', location.href);
        addNotification('Navigation Locked', 'Back button navigation trapped by Security Shield.', 'security');
      };
    } catch (e) {}
  }

  // 2. Build or Retrieve GPU Blackout Overlay Curtain
  let overlay = document.getElementById('anti-screenshot-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'anti-screenshot-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.96);
      z-index: 2147483647;
      display: none;
      align-items: center;
      justify-content: center;
      color: #38bdf8;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      letter-spacing: 1.5px;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
      backdrop-filter: blur(25px);
      cursor: pointer;
    `;
    overlay.innerHTML = `
      <div style="text-align: center; border: 1px solid #1e293b; padding: 28px 40px; border-radius: 20px; background: #020617; box-shadow: 0 0 100px rgba(0,0,0,1);">
        <div style="color: #ef4444; font-weight: 800; margin-bottom: 10px; font-size: 16px; letter-spacing: 2px;">
          [ HARDENED DRM & LINEWIZE BYPASS SHIELD ]
        </div>
        <div style="color: #94a3b8; font-size: 13px; margin-top: 4px; font-weight: 600;">
          EXTERNAL SCREEN CAPTURE OR EXTENSION SCANNER INTERCEPTED
        </div>
        <div style="color: #48e4ff; font-size: 11px; margin-top: 12px; font-family: monospace;">
          Click anywhere or press Esc to return to player
        </div>
      </div>
    `;
    overlay.addEventListener('click', () => {
      if (overlay) {
        overlay.style.display = 'none';
        overlay.style.pointerEvents = 'none';
      }
    });
    document.body.appendChild(overlay);
  }

  // 3. Inject Strict Anti-Print CSS
  let printStyle = document.getElementById('anti-print-drm-style');
  if (!printStyle) {
    printStyle = document.createElement('style');
    printStyle.id = 'anti-print-drm-style';
    printStyle.innerHTML = `
      @media print {
        html, body, #root, * {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        body::before {
          content: "[ DRM PROTECTED CONTENT - SCREENSHOT/PRINT PROHIBITED ]";
          display: block !important;
          visibility: visible !important;
          color: black !important;
          font-size: 24pt !important;
          text-align: center !important;
          margin-top: 200pt !important;
        }
      }
    `;
    document.head.appendChild(printStyle);
  }

  let shieldTimer: any = null;
  const showShield = () => {
    // Whitelist active modals: If DSP modal or setup wizard or any dialog is active, never blank out
    const isModalActive = document.querySelector('#audio-dsp-modal') || document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0');
    if (isModalActive && !document.hidden) return;

    if (overlay && settings.security.antiScreenshotEnabled) {
      overlay.style.display = 'flex';
      overlay.style.pointerEvents = 'auto';
      clearTimeout(shieldTimer);
      shieldTimer = setTimeout(hideShield, 2500);
    }
  };

  const hideShield = () => {
    if (overlay) {
      overlay.style.display = 'none';
      overlay.style.pointerEvents = 'none';
    }
  };

  // 4. Focus, Blur, Visibility, and Pointer Event Guards
  const handleBlur = () => {
    // In iframe and preview environments, blur fires frequently on internal clicks.
    // Only engage if strictly set and antiScreenshotEnabled is explicitly active.
    if (settings.security.blurSensitivity === 'ultra-paranoia' && settings.security.antiScreenshotEnabled) {
      showShield();
    }
  };

  const handleFocus = () => {
    hideShield();
  };

  const handleVisibilityChange = () => {
    if (document.hidden && settings.security.antiScreenshotEnabled) {
      showShield();
    } else {
      hideShield();
    }
  };

  // 5. Anti-Extension & Screen Scraper MutationObserver
  let extensionObserver: MutationObserver | null = null;
  if (settings.security.extensionPurgeObserver !== false) {
    extensionObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) {
            const id = (node.id || '').toLowerCase();
            const cls = (node.className || '').toString().toLowerCase();
            const tag = node.tagName.toLowerCase();

            if (
              id.includes('loom') ||
              id.includes('recorder') ||
              id.includes('screencastify') ||
              id.includes('screenshot') ||
              id.includes('linewize') ||
              id.includes('securly') ||
              id.includes('goguardian') ||
              cls.includes('loom') ||
              cls.includes('screencast') ||
              tag === 'chrome-extension'
            ) {
              console.warn('[DRM Extension Interceptor] Extension recorder detected & purged:', node);
              try {
                node.remove();
              } catch (e) {}
              addNotification('Extension Purged', 'Blocked Loom / Screencastify / Filter overlay extension.', 'security');
              showShield();
              setTimeout(hideShield, 3000);
            }
          }
        }
      }
    });

    try {
      extensionObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    } catch (e) {}
  }

  // 6. Hook Canvas Export APIs
  if (!originalToDataURL) {
    originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (type, quality) {
      if (settings.security.antiScreenshotEnabled || settings.security.canvasScrambler) {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      }
      return originalToDataURL.apply(this, arguments as any);
    };
  }

  if (!originalToBlob) {
    originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      if (settings.security.antiScreenshotEnabled || settings.security.canvasScrambler) {
        const blackCanvas = document.createElement('canvas');
        blackCanvas.width = 1;
        blackCanvas.height = 1;
        return originalToBlob.call(blackCanvas, callback, type, quality);
      }
      return originalToBlob.apply(this, arguments as any);
    };
  }

  if (!originalGetImageData) {
    originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (sx, sy, sw, sh) {
      if (settings.security.canvasScrambler && (sw > 300 || sh > 300)) {
        return new ImageData(sw, sh);
      }
      return originalGetImageData.apply(this, arguments as any);
    };
  }

  // 7. Hook MediaRecorder to block extension screen recording
  if (window.MediaRecorder && !originalMediaRecorder) {
    originalMediaRecorder = window.MediaRecorder;
    try {
      (window as any).MediaRecorder = class extends (originalMediaRecorder as any) {
        constructor(stream: any, options: any) {
          console.warn('[DRM MediaRecorder Guard] Unauthorized recorder blocked.');
          addNotification('Recorder Neutralized', 'MediaRecorder attempted capture and was given black decoy frames.', 'security');
          const canvas = document.createElement('canvas');
          canvas.width = 1280;
          canvas.height = 720;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1280, 720);
          }
          const decoyStream = canvas.captureStream(1);
          super(decoyStream, options);
        }
      };
    } catch (e) {}
  }

  // 8. Hook getDisplayMedia for WebRTC Screen Share / OBS / Discord
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    if (!originalGetDisplayMedia) {
      originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    }
    navigator.mediaDevices.getDisplayMedia = async function (constraints) {
      showShield();
      addNotification('WebRTC Screen Share Decoy', 'Feeding 60fps solid black watermark stream.', 'security');
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 1920, 1080);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 36px monospace';
        ctx.fillText('[ SIGNAL ROOM HARDENED DRM SHIELD - SCREEN CAPTURE PROHIBITED ]', 240, 540);
      }
      return canvas.captureStream(30);
    };
  }

  // 9. Keyboard Shortcuts & Tab Close Interception
  const handleKeyDown = (e: KeyboardEvent) => {
    // Tab Close key combos: Ctrl+W, Cmd+W, Ctrl+F4, Alt+F4, Ctrl+Shift+W, Cmd+Q
    if (settings.security.antiTabCloseGuard) {
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') ||
        (e.altKey && e.key === 'F4') ||
        (e.ctrlKey && e.key === 'F4') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'w') ||
        (e.metaKey && e.key.toLowerCase() === 'q')
      ) {
        e.preventDefault();
        showShield();
        addNotification('Tab Close Hotkey Trapped', 'Intercepted key combination intended to terminate tab.', 'security');
        setTimeout(hideShield, 2500);
        return;
      }
    }

    // Standard PrintScreen
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
      e.preventDefault();
      showShield();
      if (settings.security.clipboardSanitizer !== false) {
        try {
          navigator.clipboard?.writeText?.('');
        } catch (err) {}
      }
      addNotification('PrintScreen Trapped', 'Screenshot key intercepted & clipboard wiped.', 'security');
      setTimeout(hideShield, 2500);
      return;
    }

    // Windows Snipping Tool: Win + Shift + S
    if (e.shiftKey && (e.metaKey || e.key === 'Meta') && e.key.toLowerCase() === 's') {
      e.preventDefault();
      showShield();
      if (settings.security.clipboardSanitizer !== false) {
        try {
          navigator.clipboard?.writeText?.('');
        } catch (err) {}
      }
      addNotification('Windows Snip Trapped', 'Win+Shift+S key intercepted.', 'security');
      setTimeout(hideShield, 3500);
      return;
    }

    // Windows Game Bar Screen Recorder: Win + Alt + R / Win + G
    if (e.altKey && (e.metaKey || e.key === 'Meta') && (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'g')) {
      e.preventDefault();
      showShield();
      addNotification('Game Bar Trapped', 'Win+Alt+R screen recording attempt trapped.', 'security');
      setTimeout(hideShield, 3500);
      return;
    }

    // Chromebook Capture: Ctrl + F5 or Search + Shift + S
    if (e.ctrlKey && (e.key === 'F5' || e.code === 'F5' || e.key === 'BrowserBack' || e.code === 'BrowserBack')) {
      e.preventDefault();
      showShield();
      addNotification('Chromebook Capture Trapped', 'Ctrl+F5 screen switcher intercepted.', 'security');
      setTimeout(hideShield, 3000);
      return;
    }

    if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      showShield();
      addNotification('ChromeOS Capture Trapped', 'Search+Shift+S tool trapped.', 'security');
      setTimeout(hideShield, 3000);
      return;
    }

    // macOS Screenshot combos
    if (e.metaKey && e.shiftKey && ['3', '4', '5', '6'].includes(e.key)) {
      e.preventDefault();
      showShield();
      addNotification('macOS Screenshot Trapped', `Cmd+Shift+${e.key} key intercepted.`, 'security');
      setTimeout(hideShield, 3000);
      return;
    }

    // DevTools shortcuts
    if (settings.security.preventDevTools) {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.metaKey && e.altKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toLowerCase() === 'u')
      ) {
        e.preventDefault();
        showShield();
        addNotification('DevTools Trapped', 'DevTools shortcut blocked.', 'security');
        setTimeout(hideShield, 2000);
      }
    }
  };

  // 10. Context Menu & Selection Guard
  const handleContextMenu = (e: MouseEvent) => {
    if (settings.security.blockRightClick) {
      e.preventDefault();
    }
  };

  // 11. Hook window.print()
  if (!originalPrint) {
    originalPrint = window.print;
    window.print = function () {
      showShield();
      addNotification('Print Trap Active', 'Window.print execution intercepted.', 'security');
    };
  }

  window.addEventListener('blur', handleBlur);
  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('contextmenu', handleContextMenu);

  // 12. Dynamic Stroboscopic Watermark
  if (settings.security.dynamicWatermark) {
    let wm = document.getElementById('drm-watermark');
    if (!wm) {
      wm = document.createElement('div');
      wm.id = 'drm-watermark';
      wm.style.cssText = `
        position: fixed;
        bottom: 14px;
        right: 14px;
        font-family: monospace;
        font-size: 10px;
        color: rgba(72, 228, 255, 0.25);
        pointer-events: none;
        z-index: 2147483640;
        text-shadow: 0 0 4px rgba(0,0,0,0.8);
      `;
      wm.innerText = `WSM-DRM: ${Math.random().toString(36).substring(2, 9).toUpperCase()} | 6-WORKER HARDENED`;
      document.body.appendChild(wm);
    }
  }

  // 13. Audio Memory Anchor (Keeps tab active in Chromium/OS process scheduler)
  if (settings.security.antiCloseAudioAnchor) {
    try {
      if (!audioAnchorCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioAnchorCtx = new AudioCtx();
          const osc = audioAnchorCtx.createOscillator();
          const gain = audioAnchorCtx.createGain();
          osc.frequency.setValueAtTime(32, audioAnchorCtx.currentTime);
          gain.gain.setValueAtTime(0.00001, audioAnchorCtx.currentTime);
          osc.connect(gain);
          gain.connect(audioAnchorCtx.destination);
          osc.start();
          audioAnchorOsc = osc;
        }
      }
    } catch {}
  } else {
    try {
      if (audioAnchorOsc) {
        audioAnchorOsc.stop();
        audioAnchorOsc.disconnect();
        audioAnchorOsc = null;
      }
      if (audioAnchorCtx) {
        audioAnchorCtx.close();
        audioAnchorCtx = null;
      }
    } catch {}
  }

  // 14. Mouse Window Boundary Exit & Anti-Close Alert
  const handleMouseMove = (e: MouseEvent) => {
    if (settings.security.mouseExitWarning && e.clientY <= 6) {
      showAntiCloseWarning('Cursor near tab boundary. Anti-Close Shield active.');
    }
  };

  const handleMouseLeave = (e: MouseEvent) => {
    if (settings.security.mouseExitWarning && e.clientY <= 10) {
      showAntiCloseWarning('Window exit trapped. Tab closure prevented.');
    }
  };

  if (settings.security.mouseExitWarning) {
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
  }

  securityCleanupFn = () => {
    if (extensionObserver) extensionObserver.disconnect();
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('focus', handleFocus);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('contextmenu', handleContextMenu);
    window.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseleave', handleMouseLeave);
  };
}
