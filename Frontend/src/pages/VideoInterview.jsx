import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, Send, AudioLines } from 'lucide-react';

export default function VideoInterview({ onBack, role = 'Full Stack Developer', difficulty = 'Medium', type = 'mixed', totalQuestions = 5 }) {
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

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (!loading && status === 'Camera ready') fetchNextTurn([]);
  }, [loading]);

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

  const stopCamera = () => streamRef.current?.getTracks().forEach(t => t.stop());

  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled); }
  };

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
  };

  const endCall = () => { stopCamera(); onBack(); };

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
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
        turnNumber: updatedHistory.length, totalQuestions
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
        const res = await axios.post('/api/interview/video-summary', { role, difficulty, history: newHistory });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1 tracking-tight">Video Interview</h1>
        <p className="text-gray-500 text-sm">{role} · {difficulty}</p>
      </div>

      {/* Stage */}
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/8" style={{
        background: 'radial-gradient(120% 100% at 50% 0%, #161a2e 0%, #0a0b14 55%, #060710 100%)'
      }}>
        {/* vignette */}
        <div className="pointer-events-none absolute inset-0" style={{
          boxShadow: 'inset 0 0 120px 30px rgba(0,0,0,0.55)'
        }} />

        {/* Full blurred office background */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(160deg, #0f1623 0%, #141b2d 40%, #0a0e18 100%)'
        }}>
          {/* Subtle ambient light behind interviewer */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 55% 50% at 50% 45%, rgba(99,102,241,0.07) 0%, transparent 70%)'
          }} />
        </div>

        {/* Interviewer — centered, takes full stage like a real video call */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 1 }}>
          {/* Avatar with speaking border */}
          <div className="relative" style={{
            borderRadius: '50%',
            padding: 4,
            background: speaking
              ? 'linear-gradient(135deg, #6366f1, #22d3ee)'
              : 'rgba(255,255,255,0.06)',
            boxShadow: speaking ? '0 0 40px rgba(99,102,241,0.5)' : 'none',
            transition: 'all 0.4s ease'
          }}>
            <div style={{ borderRadius: '50%', overflow: 'hidden', width: 160, height: 160, background: '#1a2035' }}>
              <svg viewBox="0 0 160 160" width="160" height="160">
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
                {/* Room background */}
                <rect width="160" height="160" fill="url(#roomBg)" />
                {/* Bookshelf hint in background */}
                <rect x="0" y="30" width="20" height="80" fill="#1a2030" opacity="0.6" />
                <rect x="2" y="35" width="16" height="4" rx="1" fill="#4a3060" opacity="0.5" />
                <rect x="2" y="42" width="16" height="4" rx="1" fill="#304060" opacity="0.5" />
                <rect x="2" y="49" width="16" height="4" rx="1" fill="#604030" opacity="0.5" />
                {/* Monitor glow on face */}
                <ellipse cx="80" cy="90" rx="55" ry="30" fill="rgba(120,140,200,0.04)" />
                {/* Shoulders / suit jacket */}
                <ellipse cx="80" cy="175" rx="60" ry="35" fill="#1e2640" />
                <ellipse cx="80" cy="168" rx="45" ry="28" fill="#242e50" />
                {/* White shirt + tie */}
                <polygon points="80,125 70,155 90,155" fill="#f0f4ff" />
                <polygon points="80,125 68,150 72,155" fill="#e0e8f8" />
                <rect x="77" y="126" width="6" height="28" rx="2" fill="#6366f1" opacity="0.8" />
                {/* Neck */}
                <ellipse cx="80" cy="120" rx="12" ry="9" fill="url(#skinTone)" />
                {/* Head */}
                <ellipse cx="80" cy="88" rx="30" ry="33" fill="url(#skinTone)" />
                {/* Hair — short professional */}
                <ellipse cx="80" cy="60" rx="30" ry="18" fill="#1a110a" />
                <ellipse cx="80" cy="57" rx="28" ry="14" fill="#231508" />
                <ellipse cx="56" cy="72" rx="8" ry="14" fill="#1a110a" />
                <ellipse cx="104" cy="72" rx="8" ry="14" fill="#1a110a" />
                {/* Ears */}
                <ellipse cx="50" cy="90" rx="5" ry="7" fill="#c08050" />
                <ellipse cx="110" cy="90" rx="5" ry="7" fill="#c08050" />
                {/* Eyes */}
                <ellipse cx="68" cy="88" rx="5" ry="5.5" fill="white" />
                <ellipse cx="92" cy="88" rx="5" ry="5.5" fill="white" />
                <ellipse cx="68" cy="89" rx="3.5" ry="4" fill="#2d1800" />
                <ellipse cx="92" cy="89" rx="3.5" ry="4" fill="#2d1800" />
                <ellipse cx="69" cy="87.5" rx="1.3" ry="1.3" fill="white" opacity="0.8" />
                <ellipse cx="93" cy="87.5" rx="1.3" ry="1.3" fill="white" opacity="0.8" />
                {/* Eyebrows */}
                <path d="M62 80 Q68 76 74 79" stroke="#1a110a" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M86 79 Q92 76 98 80" stroke="#1a110a" strokeWidth="2" fill="none" strokeLinecap="round" />
                {/* Nose */}
                <path d="M78 95 Q80 100 82 95" stroke="#b07840" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                {/* Mouth */}
                <path d={speaking ? "M72 108 Q80 115 88 108" : "M73 108 Q80 112 87 108"}
                  stroke="#8a5a38" strokeWidth="2" fill="none" strokeLinecap="round"
                  style={{ transition: 'd 0.2s ease' }} />
                {/* Subtle laptop/desk reflection */}
                <ellipse cx="80" cy="155" rx="35" ry="6" fill="rgba(100,120,180,0.08)" />
              </svg>
            </div>
          </div>

          {/* Name + speaking indicator — right below avatar, centered */}
          <div className="mt-4 flex items-center gap-2">
            {speaking && (
              <span className="flex gap-0.5 items-end h-4">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-0.5 rounded-full bg-indigo-400"
                    style={{ height: `${10 + i * 4}px`, animation: `bounce 0.6s ${i * 0.15}s infinite alternate` }} />
                ))}
              </span>
            )}
            {aiLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
            <span className="text-white text-sm font-medium">Priya Sharma</span>
            <span className="text-gray-500 text-xs">· Senior Engineer, Google</span>
          </div>
        </div>

        {/* Captions — centered bottom, wide, like Google Meet */}
        {(spokenText || aiLoading) && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[90%] max-w-lg" style={{ zIndex: 2 }}>
            <div className="backdrop-blur-md bg-black/70 rounded-2xl px-6 py-3 border border-white/8 text-center">
              {aiLoading ? (
                <span className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : (
                <p className="text-gray-100 text-sm leading-relaxed">{spokenText}</p>
              )}
            </div>
          </div>
        )}

        <style>{`
          @keyframes bounce {
            from { transform: scaleY(0.6); }
            to { transform: scaleY(1.4); }
          }
        `}</style>

        {/* Self camera */}
        <div className="absolute top-4 right-4 w-36 sm:w-48 aspect-video rounded-xl overflow-hidden border border-white/15 shadow-xl bg-black ring-1 ring-black/40">
          {loading && (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
          <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${loading ? 'hidden' : ''}`} />
          <span className="absolute bottom-1.5 left-1.5 text-[10px] text-white/90 bg-black/50 backdrop-blur px-2 py-0.5 rounded-full">You</span>
        </div>

        {/* Live badge */}
        <div className="absolute top-4 left-4">
          <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-gray-300 bg-black/40 backdrop-blur border border-white/10 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
          </span>
        </div>

        {/* Call controls */}
        <div className="absolute bottom-6 left-6 flex items-center gap-2">
          <button onClick={toggleMic} className={`w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur transition-all ${micOn ? 'border-white/15 bg-black/30 text-gray-300 hover:border-cyan-400/40' : 'bg-red-500/20 border-red-500/40 text-red-400'}`}>
            {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button onClick={toggleCam} className={`w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur transition-all ${camOn ? 'border-white/15 bg-black/30 text-gray-300 hover:border-cyan-400/40' : 'bg-red-500/20 border-red-500/40 text-red-400'}`}>
            {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
          <button onClick={endCall} className="w-9 h-9 rounded-full flex items-center justify-center bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all">
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Answer panel */}
      {!loading && !interviewEnded && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-500 tracking-wide uppercase">Your Answer</label>
            <button
              onClick={toggleListening}
              disabled={aiLoading}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all ${listening ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'border-indigo-400/30 text-indigo-300 hover:bg-indigo-400/10'}`}
            >
              {listening ? <AudioLines className="w-3.5 h-3.5 animate-pulse" /> : <Mic className="w-3.5 h-3.5" />}
              {listening ? 'Listening...' : 'Speak Answer'}
            </button>
          </div>
          <textarea
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 min-h-28 resize-none focus:outline-none focus:border-indigo-400/40 transition-colors"
            placeholder="Click 'Speak Answer' or type here..."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            disabled={aiLoading}
          />
          <button
            onClick={submitAnswer}
            disabled={aiLoading || !answer.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Send className="w-4 h-4" /> {isLastQuestion ? 'Finish Interview' : 'Submit Answer'}
          </button>
        </div>
      )}

      {/* Feedback */}
      {interviewEnded && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-display font-bold text-white tracking-tight">Interview Complete</h2>
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
                <div className="text-5xl font-display font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-1">{feedback.overallScore}%</div>
                <p className="text-gray-500 text-sm">Overall Score</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[['Communication', feedback.communicationScore], ['Technical', feedback.technicalScore], ['Problem Solving', feedback.problemSolvingScore], ['Confidence', feedback.confidenceScore]].map(([label, score]) => (
                  <div key={label} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-white">{score}/10</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <p className="text-gray-300 text-sm leading-relaxed bg-white/[0.03] border border-white/5 rounded-xl p-4">{feedback.summary}</p>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-[11px] font-semibold text-green-400 mb-2 uppercase tracking-wide">Strengths</p>
                  <ul className="space-y-1.5">
                    {feedback.strengths?.map((s, i) => <li key={i} className="text-sm text-gray-400 pl-3 border-l-2 border-green-500/30">{s}</li>)}
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
  );
}