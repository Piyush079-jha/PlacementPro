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

        {/* Interviewer video panel — looks like a real person on a call */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Background gradient — feels like a real office/room */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #1e2235 0%, #0f111a 60%, #080a10 100%)'
          }} />

          {/* Human-style avatar — professional silhouette, not a robot */}
          <div className="relative flex flex-col items-center" style={{ zIndex: 1 }}>
            <div
              className="relative"
              style={{
                width: 140,
                height: 140,
                borderRadius: '50%',
                boxShadow: speaking
                  ? '0 0 0 3px #6366f1, 0 0 40px rgba(99,102,241,0.4)'
                  : '0 0 0 2px rgba(255,255,255,0.08)',
                transition: 'box-shadow 0.3s ease'
              }}
            >
              {/* Professional avatar illustration */}
              <svg viewBox="0 0 140 140" width="140" height="140" style={{ borderRadius: '50%', display: 'block' }}>
                <defs>
                  <radialGradient id="bg" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#1e2644" />
                    <stop offset="100%" stopColor="#111827" />
                  </radialGradient>
                </defs>
                <circle cx="70" cy="70" r="70" fill="url(#bg)" />
                {/* Jacket / body */}
                <ellipse cx="70" cy="130" rx="38" ry="28" fill="#1a2340" />
                <ellipse cx="70" cy="125" rx="28" ry="22" fill="#1e2a4a" />
                {/* Shirt / collar */}
                <polygon points="70,100 62,118 78,118" fill="#f1f5f9" />
                <polygon points="70,100 58,115 63,118" fill="#e2e8f0" />
                {/* Neck */}
                <ellipse cx="70" cy="97" rx="10" ry="8" fill="#c9a882" />
                {/* Head */}
                <ellipse cx="70" cy="72" rx="24" ry="26" fill="#d4a76a" />
                {/* Hair */}
                <ellipse cx="70" cy="50" rx="24" ry="13" fill="#2d1f0e" />
                <ellipse cx="70" cy="47" rx="22" ry="10" fill="#3d2a14" />
                {/* Eyes */}
                <ellipse cx="62" cy="72" rx="3.5" ry="4" fill="#1a0a00" />
                <ellipse cx="78" cy="72" rx="3.5" ry="4" fill="#1a0a00" />
                <ellipse cx="63" cy="71" rx="1.2" ry="1.5" fill="white" opacity="0.7" />
                <ellipse cx="79" cy="71" rx="1.2" ry="1.5" fill="white" opacity="0.7" />
                {/* Eyebrows */}
                <path d="M58 66 Q62 63 66 65" stroke="#2d1f0e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <path d="M74 65 Q78 63 82 66" stroke="#2d1f0e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                {/* Nose */}
                <ellipse cx="70" cy="79" rx="2.5" ry="1.5" fill="#b8894e" />
                {/* Mouth — subtle smile */}
                <path d="M64 87 Q70 91 76 87" stroke="#a0714a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                {/* Glasses (professional look) */}
                <rect x="57" y="68" width="12" height="8" rx="3" fill="none" stroke="#374151" strokeWidth="1.3" opacity="0.7" />
                <rect x="71" y="68" width="12" height="8" rx="3" fill="none" stroke="#374151" strokeWidth="1.3" opacity="0.7" />
                <line x1="69" y1="72" x2="71" y2="72" stroke="#374151" strokeWidth="1.3" />
              </svg>

              {/* Speaking pulse ring */}
              {speaking && (
                <span className="absolute inset-0 rounded-full border-2 border-indigo-400/50 animate-ping" />
              )}
            </div>

            {/* Name tag — bottom left like Zoom, not centered */}
          </div>
        </div>

        {/* Name label — bottom left, Zoom-style */}
        <div className="absolute bottom-20 left-5" style={{ zIndex: 2 }}>
          <div className="flex items-center gap-2 bg-black/55 backdrop-blur px-3 py-1.5 rounded-lg">
            {speaking && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />}
            {aiLoading && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
            <span className="text-white text-xs font-medium">Priya Sharma</span>
            <span className="text-gray-400 text-[10px]">· Technical Interviewer</span>
          </div>
        </div>

        {/* Subtitles — bottom center, like live captions */}
        {(spokenText || aiLoading) && (
          <div className="absolute bottom-6 left-16 right-6" style={{ zIndex: 2 }}>
            <div className="backdrop-blur-md bg-black/60 rounded-xl px-4 py-2.5 border border-white/8 max-w-xl">
              {aiLoading ? (
                <span className="text-gray-500 text-[13px] italic">...</span>
              ) : (
                <p className="text-gray-100 text-[13px] leading-snug">{spokenText}</p>
              )}
            </div>
          </div>
        )}

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