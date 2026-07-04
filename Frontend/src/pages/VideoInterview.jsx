import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, Send, AudioLines,
  Settings, Wifi, Pencil, ShieldCheck
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
      ? 'Preparing next question'
      : speaking
        ? 'Speaking'
        : interviewEnded
          ? 'Session complete'
          : 'Waiting for your response';

  const candidateInitial = candidateName ? candidateName[0].toUpperCase() : 'Y';
  const questionNumberDisplay = Math.min(turnNumber + 1, totalQuestions);

  return (
    <div className="min-h-screen w-full" style={{ background: '#F4F5F7', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* ===== Top Status Bar ===== */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-3 bg-white" style={{ border: '1px solid #E3E6EB' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: '#2554E8' }}>
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-sm" style={{ color: '#14171F' }}>PlacementPro Assessment</p>
              <p className="text-[11px]" style={{ color: '#8A8F98' }}>{role} · {type === 'mixed' ? 'Mixed Round' : `${type} Round`} · {difficulty}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ color: '#2554E8', background: '#EAF0FF', fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
              Question {questionNumberDisplay} / {totalQuestions}
            </span>
            <span className="text-xs font-medium" style={{ color: '#6B7280', fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
              {formatTime(elapsedSeconds)}
            </span>
            <span className="hidden md:flex items-center gap-1 text-xs" style={{ color: isOnline ? '#16A34A' : '#DC2626' }}>
              <Wifi className="w-3.5 h-3.5" /> {isOnline ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-center" style={{ color: '#9CA3AF' }}>
          This session is recorded and evaluated by AI for hiring assessment purposes.
        </p>

        {/* ===== Video stage: two tiles side-by-side ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '4/3', background: '#1B1F2A', border: speaking ? '2px solid #2554E8' : '1px solid #E3E6EB' }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #2554E8, #1B3FAE)',
                  boxShadow: speaking ? '0 0 0 6px rgba(37,84,232,0.25)' : 'none',
                  transition: 'box-shadow 0.3s ease'
                }}
              >
                AI
              </div>
              {speaking && (
                <span className="flex gap-1 items-end h-4">
                  {[0, 1, 2, 3].map(i => (
                    <span key={i} className="w-1 rounded-full" style={{ background: '#5B8DEF', height: `${6 + (i % 2) * 8}px`, animation: `bar 0.7s ${i * 0.12}s infinite alternate` }} />
                  ))}
                </span>
              )}
            </div>
            <span className="absolute bottom-2.5 left-2.5 text-[11px] text-white/90 bg-black/40 px-2 py-1 rounded-md">
              AI Interviewer
            </span>
            {aiLoading && (
              <span className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[11px] text-white/90 bg-black/40 px-2 py-1 rounded-md">
                <Loader2 className="w-3 h-3 animate-spin" /> Thinking
              </span>
            )}
          </div>

          <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '4/3', border: micOn ? '1px solid #E3E6EB' : '1px solid #FCA5A5' }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
            <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${loading || !camOn ? 'hidden' : ''}`} />
            {!camOn && !loading && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#2B2F3A' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-lg" style={{ background: '#4B5566' }}>
                  {candidateInitial}
                </div>
              </div>
            )}
            <span className="absolute bottom-2.5 left-2.5 text-[11px] text-white/90 bg-black/40 px-2 py-1 rounded-md flex items-center gap-1">
              {candidateName || 'You'}
              {listening && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
            </span>
            {!micOn && (
              <span className="absolute bottom-2.5 right-2.5 bg-red-500/90 rounded-md p-1">
                <MicOff className="w-3 h-3 text-white" />
              </span>
            )}
          </div>
        </div>

        {/* Caption bar */}
        <div className="rounded-xl px-5 py-4 bg-white" style={{ border: '1px solid #E3E6EB', minHeight: '64px' }}>
          {aiLoading ? (
            <span className="flex items-center gap-2 text-sm" style={{ color: '#8A8F98' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#8A8F98' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#8A8F98', animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#8A8F98', animationDelay: '300ms' }} />
            </span>
          ) : nudgeText ? (
            <p className="text-sm italic" style={{ color: '#2554E8' }}>{nudgeText}</p>
          ) : (
            <p className="text-[15px] leading-relaxed font-medium" style={{ color: '#14171F' }}>{spokenText}</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={toggleMic} aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ background: micOn ? '#F0F1F3' : '#FEECEC', color: micOn ? '#14171F' : '#DC2626', border: '1px solid #E3E6EB' }}>
            {micOn ? <Mic className="w-4.5 h-4.5" /> : <MicOff className="w-4.5 h-4.5" />}
          </button>
          <button onClick={toggleCam} aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ background: camOn ? '#F0F1F3' : '#FEECEC', color: camOn ? '#14171F' : '#DC2626', border: '1px solid #E3E6EB' }}>
            {camOn ? <Video className="w-4.5 h-4.5" /> : <VideoOff className="w-4.5 h-4.5" />}
          </button>
          <button onClick={endCall} aria-label="Leave interview"
            className="w-11 h-11 rounded-full flex items-center justify-center text-white transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ background: '#DC2626' }}>
            <PhoneOff className="w-4.5 h-4.5" />
          </button>
          <button onClick={openSettings} aria-label="Settings"
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ background: '#F0F1F3', color: '#14171F', border: '1px solid #E3E6EB' }}>
            <Settings className="w-4.5 h-4.5" />
          </button>
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

        {/* ===== Device Settings Modal ===== */}
        {showSettings && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setShowSettings(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl p-6 space-y-5"
              style={{ background: '#13152680%', backgroundColor: 'rgba(19,17,38,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-base">Device Settings</h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-300 text-sm">✕</button>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 uppercase tracking-wide">Camera</label>
                <select
                  value={selectedVideoId}
                  onChange={(e) => switchDevice('video', e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-400/40"
                >
                  {videoDevices.length === 0 && <option value="">No cameras found</option>}
                  {videoDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 uppercase tracking-wide">Microphone</label>
                <select
                  value={selectedAudioId}
                  onChange={(e) => switchDevice('audio', e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-400/40"
                >
                  {audioDevices.length === 0 && <option value="">No microphones found</option>}
                  {audioDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 transition-all"
              >
                Done
              </button>
            </div>
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