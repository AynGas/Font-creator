import React, { useState, useEffect, useRef } from 'react';
import { generateFontBatches, generateFontFromImage } from './services/fontGenerator';
import { Loader2, Download, Type, Palette, Settings2, ChevronRight, RefreshCw, PenTool, Upload, Info, X, FileImage, Save, FolderOpen } from 'lucide-react';
import opentype from 'opentype.js';

type CreationMode = 'theme' | 'draw' | 'upload' | null;

const DrawingCanvas = ({ onComplete, onCancel }: { onComplete: (dataUrl: string) => void, onCancel: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  return (
    <div className="space-y-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm animate-in fade-in zoom-in-95">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Draw your handwriting</h3>
        <button onClick={clear} className="text-sm text-zinc-500 hover:text-zinc-900">Clear Canvas</button>
      </div>
      <p className="text-sm text-zinc-500">Please write a few characters (e.g., "A B C a b c") to define your style.</p>
      <div className="border-2 border-zinc-200 rounded-xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={300}
          className="w-full h-[300px] touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
        />
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-medium">Cancel</button>
        <button onClick={() => {
          if (canvasRef.current) {
            onComplete(canvasRef.current.toDataURL('image/jpeg', 0.9));
          }
        }} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700">
          Generate Font
        </button>
      </div>
    </div>
  );
};

const InstallInstructionsModal = ({ onClose }: { onClose: () => void }) => {
  const [os, setOs] = useState<'windows' | 'mac' | 'linux'>('windows');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-600" />
            How to Install Your Font
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl">
            {(['windows', 'mac', 'linux'] as const).map((o) => (
              <button
                key={o}
                onClick={() => setOs(o)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
                  os === o ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
          
          <div className="space-y-4 text-sm text-zinc-600">
            {os === 'windows' && (
              <ol className="list-decimal list-inside space-y-2">
                <li>Download the <strong>.ttf</strong> or <strong>.otf</strong> file.</li>
                <li>Right-click the downloaded file.</li>
                <li>Select <strong>Install</strong> or <strong>Install for all users</strong>.</li>
                <li>The font is now ready to use in your applications.</li>
              </ol>
            )}
            {os === 'mac' && (
              <ol className="list-decimal list-inside space-y-2">
                <li>Download the <strong>.ttf</strong> or <strong>.otf</strong> file.</li>
                <li>Double-click the downloaded file to open Font Book.</li>
                <li>Click the <strong>Install Font</strong> button in the preview window.</li>
                <li>The font is now ready to use in your applications.</li>
              </ol>
            )}
            {os === 'linux' && (
              <ol className="list-decimal list-inside space-y-2">
                <li>Download the <strong>.ttf</strong> or <strong>.otf</strong> file.</li>
                <li>Double-click the font file to open it in Font Viewer.</li>
                <li>Click the <strong>Install</strong> button.</li>
                <li>Alternatively, move the file to <code className="bg-zinc-100 px-1 py-0.5 rounded">~/.local/share/fonts/</code>.</li>
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<CreationMode>(null);
  const [style, setStyle] = useState('Normal');
  const [theme, setTheme] = useState('Nordic runes');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [font, setFont] = useState<opentype.Font | null>(null);
  const [previewText, setPreviewText] = useState('Azərbaycan! 123');
  const [fontUrl, setFontUrl] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [baseImage, setBaseImage] = useState<{ data: string, mime: string } | null>(null);
  const [isError, setIsError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fontUrl) {
      const newStyle = document.createElement('style');
      newStyle.appendChild(
        document.createTextNode(`
          @font-face {
            font-family: 'GeneratedFont';
            src: url('${fontUrl}') format('truetype');
          }
        `)
      );
      document.head.appendChild(newStyle);
      return () => {
        document.head.removeChild(newStyle);
      };
    }
  }, [fontUrl]);

  const handleGenerateTheme = async () => {
    setStep(2);
    setProgress(0);
    setIsError(false);
    setMessage('Starting generation...');
    try {
      const generatedFont = await generateFontBatches(theme, style, (p, m) => {
        setProgress(p);
        setMessage(m);
      });
      finishGeneration(generatedFont);
    } catch (e) {
      console.error(e);
      setMessage('Error generating font. Please try again.');
      setIsError(true);
    }
  };

  const handleGenerateFromImage = async (dataUrl: string, targetStyle: string = style) => {
    setStep(2);
    setProgress(0);
    setIsError(false);
    setMessage('Analyzing handwriting...');
    try {
      const [prefix, base64] = dataUrl.split(',');
      const mime = prefix.match(/:(.*?);/)?.[1] || 'image/jpeg';
      setBaseImage({ data: base64, mime });
      
      const generatedFont = await generateFontFromImage(base64, mime, targetStyle, (p, m) => {
        setProgress(p);
        setMessage(m);
      });
      finishGeneration(generatedFont);
    } catch (e) {
      console.error(e);
      setMessage('Error generating font. Please try again.');
      setIsError(true);
    }
  };

  const finishGeneration = (generatedFont: opentype.Font) => {
    setFont(generatedFont);
    const buffer = generatedFont.toArrayBuffer();
    const blob = new Blob([buffer], { type: 'font/ttf' });
    const url = URL.createObjectURL(blob);
    setFontUrl(url);
    setStep(3);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // MITRE CWE-400: Uncontrolled Resource Consumption (Limit file size to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Please upload an image under 5MB.');
      return;
    }

    // MITRE CWE-434: Unrestricted Upload of File with Dangerous Type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload a JPEG, PNG, WEBP, or PDF.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        handleGenerateFromImage(event.target.result as string);
      }
      // Reset input so the same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = (format: 'ttf' | 'otf') => {
    if (font) {
      const buffer = font.toArrayBuffer();
      const blob = new Blob([buffer], { type: format === 'ttf' ? 'font/ttf' : 'font/otf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // MITRE CWE-22 / CWE-73: Sanitize filename to prevent path traversal or invalid OS characters
      const safeFamilyName = (font.names.fontFamily.en || 'AzFont').replace(/[^a-z0-9]/gi, '_');
      const safeStyle = style.replace(/[^a-z0-9]/gi, '_');
      
      a.download = `${safeFamilyName}-${safeStyle}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (fontUrl) {
      const a = document.createElement('a');
      a.href = fontUrl;
      const safeFamilyName = 'AzFont';
      const safeStyle = style.replace(/[^a-z0-9]/gi, '_');
      a.download = `${safeFamilyName}-${safeStyle}.${format}`;
      a.click();
    }
  };

  const saveDraft = async () => {
    try {
      let fontBase64 = null;
      if (fontUrl) {
        const res = await fetch(fontUrl);
        const blob = await res.blob();
        fontBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
      
      const draft = {
        theme,
        style,
        mode,
        baseImage,
        fontBase64,
        step: step === 2 ? 1 : step,
        previewText
      };
      
      localStorage.setItem('fontCraftDraft', JSON.stringify(draft));
      alert('Progress saved as draft!');
    } catch (e) {
      console.error('Failed to save draft', e);
      alert('Failed to save draft. The image or font might be too large.');
    }
  };

  const loadDraft = async () => {
    try {
      const draftStr = localStorage.getItem('fontCraftDraft');
      if (!draftStr) {
        alert('No draft found.');
        return;
      }
      
      const draft = JSON.parse(draftStr);
      if (draft.theme) setTheme(draft.theme);
      if (draft.style) setStyle(draft.style);
      if (draft.mode) setMode(draft.mode);
      if (draft.baseImage) setBaseImage(draft.baseImage);
      if (draft.previewText) setPreviewText(draft.previewText);
      
      if (draft.fontBase64) {
        const res = await fetch(draft.fontBase64);
        const blob = await res.blob();
        setFontUrl(URL.createObjectURL(blob));
      }
      
      setStep(draft.step || 1);
    } catch (e) {
      console.error('Failed to load draft', e);
      alert('Failed to load draft.');
    }
  };

  const generateVariation = (newStyle: string) => {
    setStyle(newStyle);
    if (mode === 'theme') {
      handleGenerateTheme(); // Re-run with new style
    } else if (baseImage) {
      handleGenerateFromImage(`data:${baseImage.mime};base64,${baseImage.data}`, newStyle);
    }
  };

  const reset = () => {
    setStep(1);
    setMode(null);
    setFont(null);
    setFontUrl(null);
    setProgress(0);
    setBaseImage(null);
    setIsError(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {showInstallModal && <InstallInstructionsModal onClose={() => setShowInstallModal(false)} />}
      
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            Az
          </div>
          <h1 className="text-xl font-semibold tracking-tight">AzFont Creator</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={loadDraft} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors">
            <FolderOpen className="w-4 h-4" />
            Load Draft
          </button>
          <button onClick={saveDraft} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          {step === 3 && (
            <button
              onClick={reset}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Create New
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2 text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-semibold tracking-tight">Design your custom font</h2>
              <p className="text-zinc-500">Create a font that fully supports the Azerbaijani alphabet using AI, your handwriting, or an uploaded image.</p>
            </div>

            {!mode && (
              <div className="grid md:grid-cols-3 gap-6 pt-8">
                <button onClick={() => setMode('theme')} className="flex flex-col items-center text-center p-8 bg-white rounded-2xl border border-zinc-200 hover:border-indigo-300 hover:shadow-md transition-all group">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Palette className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">AI Theme</h3>
                  <p className="text-sm text-zinc-500">Describe a style (e.g., Nordic runes) and let AI generate it.</p>
                </button>

                <button onClick={() => setMode('draw')} className="flex flex-col items-center text-center p-8 bg-white rounded-2xl border border-zinc-200 hover:border-indigo-300 hover:shadow-md transition-all group">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <PenTool className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Input Text</h3>
                  <p className="text-sm text-zinc-500">Draw your handwriting directly on the screen.</p>
                </button>

                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center text-center p-8 bg-white rounded-2xl border border-zinc-200 hover:border-indigo-300 hover:shadow-md transition-all group">
                  <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Upload Text</h3>
                  <p className="text-sm text-zinc-500">Upload an image of your handwriting to convert it.</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                  />
                </button>
              </div>
            )}

            {mode === 'theme' && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">AI Theme Generator</h3>
                  <button onClick={() => setMode(null)} className="text-sm text-zinc-500 hover:text-zinc-900">Cancel</button>
                </div>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                    <Settings2 className="w-4 h-4 text-zinc-400" />
                    Base Font Style
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Normal', 'Bold', 'Italic'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                          style === s
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                            : 'bg-zinc-50 border border-zinc-200 text-zinc-600 hover:border-zinc-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                    <Palette className="w-4 h-4 text-zinc-400" />
                    Visual Theme
                  </label>
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="e.g., Nordic runes, Cyberpunk, Old Turkic..."
                    className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <p className="text-xs text-zinc-500">
                    Describe the look and feel. The AI will generate vector paths based on this description.
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleGenerateTheme}
                    disabled={!theme.trim()}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate Font
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {mode === 'draw' && (
              <DrawingCanvas 
                onComplete={handleGenerateFromImage} 
                onCancel={() => setMode(null)} 
              />
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center justify-center py-32 space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative">
              {!isError ? (
                <>
                  <div className="w-24 h-24 border-4 border-zinc-100 rounded-full"></div>
                  <div 
                    className="absolute top-0 left-0 w-24 h-24 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-600">{Math.round(progress)}%</span>
                  </div>
                </>
              ) : (
                <div className="w-24 h-24 border-4 border-rose-100 rounded-full flex items-center justify-center text-rose-600">
                  <X className="w-10 h-10" />
                </div>
              )}
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-medium">{isError ? 'Generation Failed' : 'Crafting your font...'}</h3>
              <p className={`${isError ? 'text-rose-500' : 'text-zinc-500'} text-sm max-w-sm mx-auto`}>{message}</p>
            </div>
            {!isError ? (
              <div className="w-full max-w-md bg-zinc-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            ) : (
              <button 
                onClick={reset}
                className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors"
              >
                Go Back
              </button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Your Font is Ready</h2>
                <p className="text-zinc-500 text-sm">
                  {mode === 'theme' ? `Theme: ${theme}` : 'Handwritten Font'} • Style: {style}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowInstallModal(true)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  <Info className="w-4 h-4" />
                  Install Guide
                </button>
                <div className="flex items-center bg-indigo-600 rounded-xl shadow-sm shadow-indigo-200 overflow-hidden">
                  <button
                    onClick={() => handleDownload('ttf')}
                    className="hover:bg-indigo-700 text-white px-4 py-2.5 font-medium flex items-center gap-2 transition-all text-sm"
                  >
                    <Download className="w-4 h-4" />
                    .TTF
                  </button>
                  <div className="w-px h-5 bg-indigo-500"></div>
                  <button
                    onClick={() => handleDownload('otf')}
                    className="hover:bg-indigo-700 text-white px-4 py-2.5 font-medium flex items-center gap-2 transition-all text-sm"
                  >
                    .OTF
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
              <div className="border-b border-zinc-100 bg-zinc-50/50 p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-500">Live Preview</span>
              </div>
              <div className="p-8">
                <textarea
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  className="w-full h-48 resize-none focus:outline-none bg-transparent"
                  style={{ 
                    fontFamily: "'GeneratedFont', sans-serif",
                    fontSize: '48px',
                    lineHeight: '1.2'
                  }}
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-zinc-50 rounded-2xl p-6 border border-zinc-200">
                <h4 className="text-sm font-medium text-zinc-900 mb-4">Character Map</h4>
                <div 
                  className="grid grid-cols-8 sm:grid-cols-10 gap-3 text-center"
                  style={{ fontFamily: "'GeneratedFont', sans-serif", fontSize: '24px' }}
                >
                  {"ABCÇDEƏFGĞHXIİJKQLMNOÖPRSŞTUÜVYZabcçdeəfgğhxıijkqlmnoöprsştuüvyz0123456789".split('').map((char, i) => (
                    <div key={i} className="p-2 bg-white rounded-lg border border-zinc-200 shadow-sm hover:border-indigo-300 transition-colors cursor-default" title={char}>
                      {char}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm">
                  <h4 className="text-sm font-medium text-zinc-900 mb-4 flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-zinc-400" />
                    Style Variations
                  </h4>
                  <p className="text-xs text-zinc-500 mb-4">
                    Generate bold or italic versions of this font to complete your font family.
                  </p>
                  <div className="space-y-2">
                    {['Normal', 'Bold', 'Italic'].filter(s => s !== style).map((s) => (
                      <button
                        key={s}
                        onClick={() => generateVariation(s)}
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-medium bg-zinc-50 border border-zinc-200 text-zinc-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex justify-between items-center"
                      >
                        Generate {s}
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

