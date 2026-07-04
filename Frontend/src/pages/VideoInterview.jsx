import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, Send, AudioLines,
  Settings, Wifi, Circle, Pencil, Sparkles
} from 'lucide-react';

export default function VideoInterview({ onBack, role = 'Full Stack Developer', difficulty = 'Medium', type = 'mixed', totalQuestions = 5, candidateName: candidateNameProp }) {
  // Resolve logged-in candidate's first name — adjust the localStorage keys
  // below to match whatever your AuthContext actually stores.
  const resolveCandidateName = (explicitName) => {
    if (explicitName && explicitName.trim()) return explicitName.trim().split(' ')[0];
    try {
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        const n = parsed?.name || parsed?.fullName || parsed?.username;
        if (n) return String(n).trim().split(' ')[0];
      }
    } catch {}
    try {
      const storedName = localStorage.getItem('name');
      if (storedName) return storedName.trim().split(' ')[0];
    } catch {}
    return null; 
  };
  const [candidateName] = useState(() => resolveCandidateName(candidateNameProp));

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [status, setStatus] = useState('Connecting to camera...');
  const [loading, setLoading] = useState(true);

  const [history, setHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [spokenText, setSpokenText] = useState('');
  const [turnNumber, setTurnNumber] = useState(0);
  const [answer, setAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const recognitionRef = useRef(null);
  const greetedRef = useRef(false);
  const nameUsedInNudgeRef = useRef(false); 

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [inputMode, setInputMode] = useState('voice'); 
  const timerRef = useRef(null);

  const [nudgeText, setNudgeText] = useState('');
  const lastActivityRef = useRef(Date.now());
  const nudgeIndexRef = useRef(-1);
  const nudgeStageRef = useRef(0); 
  const usedLinesRef = useRef(new Set());

  // --- Device settings (camera/mic selection) ---
  const [showSettings, setShowSettings] = useState(false);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedAudioId, setSelectedAudioId] = useState('');




  const STAGE_1_LINES = [
    "Take your time.",
    "No rush, think it through.",
    "Go ahead whenever you're ready."
  ];

  const STAGE_2_LINES = [
    "Want me to rephrase that?",
    "Even a rough answer is fine — just think out loud.",
    `${candidateName}, you still there?`
  ];

  const STAGE_3_LINES = [
    `That's alright, ${candidateName} — let's skip this one and come back to it if there's time.`,
    "No worries, let's move on to the next question."
  ];

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (loading || status !== 'Camera ready' || greetedRef.current) return;
    greetedRef.current = true;
    // Backend owns the single greeting + first question now (candidateName is
    // already sent in the request body below) — no client-side pre-greeting,
    // so Priya only introduces herself once, like a real interviewer would.
    fetchNextTurn([]);
  }, [loading, status]);

  // Timer — starts only once the first question has actually been asked
  useEffect(() => {
    if (!loading && !interviewEnded && currentQuestion) {
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [loading, interviewEnded, currentQuestion]);

  // Network indicator
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Reset the "activity clock" whenever the candidate types or speaks
  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, [answer, listening]);

  // Fresh question = fresh start, clear any lingering nudge and reset escalation
  useEffect(() => {
    lastActivityRef.current = Date.now();
    setNudgeText('');
    nudgeStageRef.current = 0;
    nudgeIndexRef.current = -1;
    usedLinesRef.current = new Set();
  }, [currentQuestion]);


  const pickUnusedLine = (pool) => {
    const unused = pool.filter(l => !usedLinesRef.current.has(l));
    const source = unused.length > 0 ? unused : pool; // if all used, allow reuse rather than break
    const line = source[Math.floor(Math.random() * source.length)];
    usedLinesRef.current.add(line);
    return line;
  };

  useEffect(() => {
    if (loading || interviewEnded || feedbackLoading) return;
    const idleCheck = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      const isIdle = !speaking && !aiLoading && !answer.trim() && !nudgeText && !listening;
      if (!isIdle) return;

      // Stage progression based on total silence, not repeated fixed intervals
      if (idleFor > 45000 && nudgeStageRef.current >= 2) {
        // Stage 3 — offer to move on, then actually skip the question
        nudgeStageRef.current = 3;
        const line = pickUnusedLine(STAGE_3_LINES);
        setNudgeText(line);
        speak(line);
        lastActivityRef.current = Date.now();
        setTimeout(() => {
          setNudgeText('');
          if (!answer.trim()) {
            const newHistory = [...history, { question: currentQuestion, answer: '(No response — candidate chose to skip)' }];
            setHistory(newHistory);
            setAnswer('');
            if (isLastQuestion) {
              setInterviewEnded(true);
              window.speechSynthesis.cancel();
            } else {
              fetchNextTurn(newHistory);
            }
          }
        }, 5000);
      } else if (idleFor > 25000 && nudgeStageRef.current >= 1) {
        nudgeStageRef.current = 2;
        const line = pickUnusedLine(STAGE_2_LINES);
        setNudgeText(line);
        speak(line);
        lastActivityRef.current = Date.now();
        setTimeout(() => setNudgeText(''), 4500);
      } else if (idleFor > 10000 && nudgeStageRef.current === 0) {
        nudgeStageRef.current = 1;
        const line = pickUnusedLine(STAGE_1_LINES);
        setNudgeText(line);
        speak(line);
        lastActivityRef.current = Date.now();
        setTimeout(() => setNudgeText(''), 4500);
      }
    }, 5000);
    return () => clearInterval(idleCheck);
  }, [loading, interviewEnded, feedbackLoading, speaking, aiLoading, answer, nudgeText, listening, history, currentQuestion, isLastQuestion]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setAnswer(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return toast.error('Voice input not supported. Use Chrome or Edge.');
    if (listening) {
      try { recognitionRef.current.stop(); } catch {}
      setListening(false);
    } else {
      setInputMode('voice');
      setAnswer('');
      try { recognitionRef.current.start(); setListening(true); }
      catch { toast.error('Could not start voice input. Check mic permissions.'); }
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus('Camera ready');
      setLoading(false);
    } catch {
      toast.error('Camera/mic access denied');
      setStatus('Camera access denied');
      setLoading(false);
    }
  };

  const stopCamera = () => {
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
    } catch (err) {
      console.error('Error stopping camera:', err);
    } finally {
      streamRef.current = null;
    }
  };

  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
      setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
      const currentVideoTrack = streamRef.current?.getVideoTracks()[0];
      const currentAudioTrack = streamRef.current?.getAudioTracks()[0];
      if (currentVideoTrack) setSelectedVideoId(currentVideoTrack.getSettings().deviceId || '');
      if (currentAudioTrack) setSelectedAudioId(currentAudioTrack.getSettings().deviceId || '');
    } catch {
      toast.error('Could not list devices');
    }
  };

  const openSettings = async () => {
    await loadDevices();
    setShowSettings(true);
  };

  const switchDevice = async (kind, deviceId) => {
    try {
      const constraints = {
        video: kind === 'video' ? { deviceId: { exact: deviceId } } : (streamRef.current?.getVideoTracks()[0] ? { deviceId: { exact: selectedVideoId } } : true),
        audio: kind === 'audio' ? { deviceId: { exact: deviceId } } : (streamRef.current?.getAudioTracks()[0] ? { deviceId: { exact: selectedAudioId } } : true)
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      // Stop old tracks only after the new stream succeeds, so a failed switch doesn't kill the current feed
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = newStream;
      if (videoRef.current) videoRef.current.srcObject = newStream;
      // Respect current mute state on the new tracks
      newStream.getVideoTracks().forEach(t => t.enabled = camOn);
      newStream.getAudioTracks().forEach(t => t.enabled = micOn);
      if (kind === 'video') setSelectedVideoId(deviceId);
      else setSelectedAudioId(deviceId);
      toast.success(`Switched ${kind === 'video' ? 'camera' : 'microphone'}`);
    } catch {
      toast.error(`Could not switch ${kind === 'video' ? 'camera' : 'microphone'}`);
    }
  };

  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return toast.error('Camera not available');
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  };

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return toast.error('Microphone not available');
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const endCall = () => {
    if (!interviewEnded && currentQuestion) {
      const confirmLeave = window.confirm('Leave the interview now? Your progress will not be saved and this cannot be resumed.');
      if (!confirmLeave) return;
    }
    window.speechSynthesis.cancel();
    stopCamera();
    onBack();
  };

  const speak = (text) => {
    if (!('speechSynthesis' in window) || interviewEnded) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const fetchNextTurn = async (updatedHistory) => {
    setAiLoading(true);
    try {
      const res = await axios.post('/api/interview/video-turn', {
        role, difficulty, type, history: updatedHistory,
        turnNumber: updatedHistory.length, totalQuestions,
        candidateName
      });
      const turn = res.data.turn;
      setSpokenText(turn.spokenText);
      setCurrentQuestion(turn.question);
      setIsLastQuestion(!!turn.isLastQuestion);
      setTurnNumber(updatedHistory.length);
      speak(turn.spokenText);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to get next question');
    } finally {
      setAiLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || answer.trim().length < 5) return toast.error('Please answer before continuing');
    if (listening) toggleListening();
    const newHistory = [...history, { question: currentQuestion, answer }];
    setHistory(newHistory);
    setAnswer('');
    if (isLastQuestion) {
      setInterviewEnded(true);
      window.speechSynthesis.cancel();
      setFeedbackLoading(true);
      try {
        const res = await axios.post('/api/interview/video-summary', { role, difficulty, history: newHistory, candidateName });
        setFeedback(res.data.feedback);
      } catch {
        toast.error('Failed to generate final feedback');
      } finally {
        setFeedbackLoading(false);
      }
    } else {
      fetchNextTurn(newHistory);
    }
  };

  // --- UI-only helpers ---
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const aiStatusText = loading
    ? 'Connecting...'
    : aiLoading
      ? 'Thinking...'
      : speaking
        ? 'Speaking...'
        : interviewEnded
          ? 'Session complete'
          : 'Waiting for your answer';

  return (
    <div
      className="min-h-screen w-full text-gray-100 relative overflow-hidden font-sans"
      style={{
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        background: 'linear-gradient(160deg, #09090B 0%, #111827 45%, #1A103C 100%)'
      }}
    >
      {/* Faint grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-600/10 blur-[120px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-4">

        {/* ===== Top Status Bar ===== */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 sm:px-5 py-3"
          style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight text-sm sm:text-base">PlacementPro</span>
          </div>

          <div className="hidden sm:flex flex-col items-center leading-tight">
            <span className="text-sm font-semibold text-white">{role}</span>
            <span className="text-[11px] text-gray-500">{type === 'mixed' ? 'Mixed Round' : `${type} Round`} · {difficulty}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2.5 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><Circle className={`w-2 h-2 ${camOn ? 'fill-emerald-400 text-emerald-400' : 'fill-red-400 text-red-400'}`} />Camera</span>
              <span className="flex items-center gap-1"><Circle className={`w-2 h-2 ${micOn ? 'fill-emerald-400 text-emerald-400' : 'fill-red-400 text-red-400'}`} />Mic</span>
              <span className="flex items-center gap-1"><Circle className={`w-2 h-2 ${!loading ? 'fill-emerald-400 text-emerald-400' : 'fill-yellow-400 text-yellow-400'}`} />AI</span>
              <span className="flex items-center gap-1"><Wifi className={`w-3 h-3 ${isOnline ? 'text-emerald-400' : 'text-red-400'}`} />{isOnline ? 'Excellent' : 'Offline'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> {formatTime(elapsedSeconds)}
            </div>
          </div>
        </div>

        {/* ===== Interview Stage ===== */}
        <div className="relative rounded-3xl overflow-hidden"
          style={{
            minHeight: '520px',
            background: 'radial-gradient(120% 100% at 50% 0%, #161a2e 0%, #0a0b14 55%, #060710 100%)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
          <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 0 0 140px 30px rgba(0,0,0,0.55)' }} />

          {/* Interviewer — large, centered, premium */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pointer-events-none" style={{ zIndex: 1 }}>
            <div
              className="relative"
              style={{
                borderRadius: '50%',
                padding: 6,
                background: speaking
                  ? 'conic-gradient(from 0deg, #6366f1, #22d3ee, #a855f7, #6366f1)'
                  : 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(255,255,255,0.06))',
                boxShadow: speaking ? '0 0 70px rgba(99,102,241,0.55)' : '0 0 40px rgba(99,102,241,0.15)',
                transition: 'all 0.5s ease',
                animation: 'floaty 6s ease-in-out infinite'
              }}
            >
              <div
                style={{
                  borderRadius: '50%', overflow: 'hidden', width: 200, height: 200, background: '#1a2035',
                  transform: speaking ? 'scale(1.03)' : 'scale(1)', transition: 'transform 0.4s ease'
                }}
              >
                <svg viewBox="0 0 160 160" width="200" height="200">
                  <defs>
                    <radialGradient id="roomBg" cx="50%" cy="30%">
                      <stop offset="0%" stopColor="#2a3050" />
                      <stop offset="100%" stopColor="#141825" />
                    </radialGradient>
                    <radialGradient id="skinTone" cx="50%" cy="40%">
                      <stop offset="0%" stopColor="#e8b88a" />
                      <stop offset="100%" stopColor="#c89060" />
                    </radialGradient>
                  </defs>
                  <rect width="160" height="160" fill="url(#roomBg)" />
                  <rect x="0" y="30" width="20" height="80" fill="#1a2030" opacity="0.6" />
                  <rect x="2" y="35" width="16" height="4" rx="1" fill="#4a3060" opacity="0.5" />
                  <rect x="2" y="42" width="16" height="4" rx="1" fill="#304060" opacity="0.5" />
                  <rect x="2" y="49" width="16" height="4" rx="1" fill="#604030" opacity="0.5" />
                  <ellipse cx="80" cy="90" rx="55" ry="30" fill="rgba(120,140,200,0.04)" />
                  <ellipse cx="80" cy="175" rx="60" ry="35" fill="#1e2640" />
                  <ellipse cx="80" cy="168" rx="45" ry="28" fill="#242e50" />
                  <polygon points="80,125 70,155 90,155" fill="#f0f4ff" />
                  <polygon points="80,125 68,150 72,155" fill="#e0e8f8" />
                  <rect x="77" y="126" width="6" height="28" rx="2" fill="#6366f1" opacity="0.8" />
                  <ellipse cx="80" cy="120" rx="12" ry="9" fill="url(#skinTone)" />
                  <ellipse cx="80" cy="88" rx="30" ry="33" fill="url(#skinTone)" />
                  <ellipse cx="80" cy="60" rx="30" ry="18" fill="#1a110a" />
                  <ellipse cx="80" cy="57" rx="28" ry="14" fill="#231508" />
                  <ellipse cx="56" cy="72" rx="8" ry="14" fill="#1a110a" />
                  <ellipse cx="104" cy="72" rx="8" ry="14" fill="#1a110a" />
                  <ellipse cx="50" cy="90" rx="5" ry="7" fill="#c08050" />
                  <ellipse cx="110" cy="90" rx="5" ry="7" fill="#c08050" />
                  <ellipse cx="68" cy="88" rx="5" ry="5.5" fill="white" />
                  <ellipse cx="92" cy="88" rx="5" ry="5.5" fill="white" />
                  <ellipse cx="68" cy="89" rx="3.5" ry="4" fill="#2d1800" />
                  <ellipse cx="92" cy="89" rx="3.5" ry="4" fill="#2d1800" />
                  <ellipse cx="69" cy="87.5" rx="1.3" ry="1.3" fill="white" opacity="0.8" />
                  <ellipse cx="93" cy="87.5" rx="1.3" ry="1.3" fill="white" opacity="0.8" />
                  <path d="M62 80 Q68 76 74 79" stroke="#1a110a" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M86 79 Q92 76 98 80" stroke="#1a110a" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M78 95 Q80 100 82 95" stroke="#b07840" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <path d={speaking ? "M72 108 Q80 115 88 108" : "M73 108 Q80 112 87 108"}
                    stroke="#8a5a38" strokeWidth="2" fill="none" strokeLinecap="round"
                    style={{ transition: 'd 0.2s ease' }} />
                  <ellipse cx="80" cy="155" rx="35" ry="6" fill="rgba(100,120,180,0.08)" />
                </svg>
              </div>
            </div>

            {/* Name / role / live status — replaces chat bubble */}
            <div className="mt-5 text-center">
              <p className="text-white text-base font-semibold tracking-tight">Priya Sharma</p>
              <p className="text-gray-500 text-xs mb-2">Senior Software Engineer · Google</p>
              <div className="flex items-center justify-center gap-2 text-xs font-medium">
                {speaking && (
                  <span className="flex gap-0.5 items-end h-3.5">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-0.5 rounded-full bg-indigo-400"
                        style={{ height: `${8 + i * 3}px`, animation: `bounce 0.6s ${i * 0.15}s infinite alternate` }} />
                    ))}
                  </span>
                )}
                {aiLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
                <span className={speaking ? 'text-indigo-300' : aiLoading ? 'text-cyan-300' : 'text-gray-500'}>
                  {aiStatusText}
                </span>
              </div>
            </div>
          </div>

          {/* Captions — Google Meet style */}
          {(spokenText || aiLoading || nudgeText) && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[92%] max-w-xl" style={{ zIndex: 2 }}>
              <div className="rounded-2xl px-6 py-3.5 text-center"
                style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {aiLoading ? (
                  <span className="flex items-center justify-center gap-1.5 text-gray-500 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                ) : nudgeText ? (
                  <p className="text-indigo-300 italic font-medium leading-relaxed" style={{ fontSize: '16px' }}>{nudgeText}</p>
                ) : (
                  <p className="text-gray-100 font-semibold leading-relaxed" style={{ fontSize: '18px' }}>{spokenText}</p>
                )}
              </div>
            </div>
          )}

          <style>{`
            @keyframes bounce { from { transform: scaleY(0.6); } to { transform: scaleY(1.4); } }
            @keyframes floaty { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
            @keyframes breathe { 0%, 100% { opacity: 0.9; } 50% { opacity: 1; } }
          `}</style>

          {/* Candidate camera — top right, larger, glass */}
          <div
            className="absolute top-4 right-4 rounded-xl overflow-hidden shadow-2xl bg-black"
            style={{
              width: 220, height: 124,
              border: `1.5px solid ${camOn ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.15)'}`,
              backdropFilter: 'blur(10px)',
              boxShadow: micOn && !loading ? '0 0 24px rgba(99,102,241,0.25)' : '0 8px 24px rgba(0,0,0,0.4)',
              transition: 'all 0.3s ease'
            }}
          >
            {loading && (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              width={220}
              height={124}
              className={`w-full h-full object-cover ${loading || !camOn ? 'hidden' : ''}`}
            />
            <span className="absolute bottom-1.5 left-1.5 text-[10px] text-white/90 bg-black/50 backdrop-blur px-2 py-0.5 rounded-full flex items-center gap-1">
              You
              {listening && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
            </span>
            {!camOn && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-1.5">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-gray-300">You</div>
                <VideoOff className="w-4 h-4 text-gray-500" />
              </div>
            )}
          </div>

          {/* Bottom controls — centered, Meet-style */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3" style={{ zIndex: 3 }}>
            <button
              onClick={toggleMic}
              aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
              className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 ${micOn ? 'border-white/15 bg-white/5 text-gray-200 hover:border-indigo-400/40' : 'bg-red-500/20 border-red-500/40 text-red-400'}`}
              style={{ backdropFilter: 'blur(12px)' }}
            >
              {micOn ? <Mic className="w-4.5 h-4.5" /> : <MicOff className="w-4.5 h-4.5" />}
            </button>
            <button
              onClick={toggleCam}
              aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
              className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 ${camOn ? 'border-white/15 bg-white/5 text-gray-200 hover:border-indigo-400/40' : 'bg-red-500/20 border-red-500/40 text-red-400'}`}
              style={{ backdropFilter: 'blur(12px)' }}
            >
              {camOn ? <Video className="w-4.5 h-4.5" /> : <VideoOff className="w-4.5 h-4.5" />}
            </button>
            <button
              onClick={endCall}
              aria-label="Leave interview"
              className="w-11 h-11 rounded-full flex items-center justify-center bg-red-500/90 text-white hover:bg-red-500 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-red-400/60"
            >
              <PhoneOff className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={openSettings}
              aria-label="Settings"
              className="w-11 h-11 rounded-full flex items-center justify-center border border-white/15 bg-white/5 text-gray-300 hover:border-indigo-400/40 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* ===== Answer panel ===== */}
        {!loading && !interviewEnded && (
          <div className="rounded-2xl p-5 space-y-3"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                {listening && inputMode === 'voice' ? (
                  <span className="flex items-center gap-1.5 text-red-400 normal-case font-semibold">
                    <AudioLines className="w-3.5 h-3.5 animate-pulse" /> Listening...
                  </span>
                ) : (
                  <span>Your Answer</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {inputMode === 'text' && (
                  <button
                    onClick={() => setInputMode('voice')}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20 transition-all"
                  >
                    <Mic className="w-3.5 h-3.5" /> Voice Mode
                  </button>
                )}
                <button
                  onClick={toggleListening}
                  disabled={aiLoading}
                  className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400/50 ${listening ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'border-indigo-400/30 text-indigo-300 hover:bg-indigo-400/10'}`}
                >
                  {listening ? <AudioLines className="w-3.5 h-3.5 animate-pulse" /> : <Mic className="w-3.5 h-3.5" />}
                  {listening ? 'Stop' : 'Speak Answer'}
                </button>
              </div>
            </div>

            {/* Voice mode: live transcript display (read-only feel) */}
            {inputMode === 'voice' ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => { if (listening) toggleListening(); setInputMode('text'); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { if (listening) toggleListening(); setInputMode('text'); } }}
                className="w-full min-h-28 rounded-xl px-4 py-3 text-sm cursor-text focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {answer ? (
                  <p className="text-gray-100 leading-relaxed">{answer}</p>
                ) : (
                  <p className="text-gray-600 flex items-center gap-2">
                    Click "Speak Answer" to talk, or <span className="inline-flex items-center gap-1 text-indigo-400"><Pencil className="w-3 h-3" />click here to type</span> instead.
                  </p>
                )}
              </div>
            ) : (
              <textarea
                autoFocus
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 min-h-28 resize-none focus:outline-none focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/30 transition-colors"
                placeholder="Type your answer..."
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                disabled={aiLoading}
              />
            )}

            <button
              onClick={submitAnswer}
              disabled={aiLoading || listening || !answer.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            >
              <Send className="w-4 h-4" />
              {listening ? 'Finish speaking first' : isLastQuestion ? 'Finish Interview' : 'Submit Answer'}
            </button>
          </div>
        )}

        {/* ===== Feedback ===== */}
        {interviewEnded && (
          <div className="rounded-2xl p-6 space-y-5"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white tracking-tight">Great effort{candidateName ? `, ${candidateName}` : ''}!</h2>
              <p className="text-gray-500 text-sm mt-1">Here's your detailed performance review</p>
            </div>

            {feedbackLoading && (
              <div className="flex flex-col items-center gap-2 py-10 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm">Analyzing your performance...</span>
              </div>
            )}

            {feedback && (
              <>
                <div className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-1">{feedback.overallScore}%</div>
                  <p className="text-gray-500 text-sm">Overall Score</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[['Communication', feedback.communicationScore], ['Technical', feedback.technicalScore], ['Problem Solving', feedback.problemSolvingScore], ['Confidence', feedback.confidenceScore]].map(([label, score]) => (
                    <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-lg font-bold text-white">{score}/10</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                <p className="text-gray-300 text-sm leading-relaxed rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>{feedback.summary}</p>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-400 mb-2 uppercase tracking-wide">Strengths</p>
                    <ul className="space-y-1.5">
                      {feedback.strengths?.map((s, i) => <li key={i} className="text-sm text-gray-400 pl-3 border-l-2 border-emerald-500/30">{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-yellow-400 mb-2 uppercase tracking-wide">Areas to Improve</p>
                    <ul className="space-y-1.5">
                      {feedback.weaknesses?.map((w, i) => <li key={i} className="text-sm text-gray-400 pl-3 border-l-2 border-yellow-500/30">{w}</li>)}
                    </ul>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-indigo-300 mb-2 uppercase tracking-wide">Actionable Tips</p>
                  <ul className="space-y-1.5">
                    {feedback.actionableTips?.map((t, i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-indigo-400">→</span>{t}</li>)}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}