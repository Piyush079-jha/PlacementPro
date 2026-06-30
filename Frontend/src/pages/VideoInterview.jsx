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

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Waveform ring avatar */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full -rotate-90">
              {[...Array(28)].map((_, i) => {
                const angle = (i / 28) * 360;
                const base = 4;
                const variance = speaking ? base + Math.abs(Math.sin((i * 13) % 7) * 14) : base;
                return (
                  <rect
                    key={i}
                    x="59"
                    y={6}
                    width="2.2"
                    height={variance}
                    rx="1.1"
                    fill={speaking ? '#22d3ee' : '#3730a3'}
                    opacity={speaking ? 0.9 : 0.35}
                    style={{
                      transformOrigin: '60px 60px',
                      transform: `rotate(${angle}deg)`,
                      transition: 'height 120ms ease, opacity 300ms ease'
                    }}
                  />
                );
              })}
            </svg>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${speaking ? 'bg-cyan-400/15 scale-105' : 'bg-indigo-500/15'}`}
              style={{ boxShadow: speaking ? '0 0 30px rgba(34,211,238,0.35)' : '0 0 20px rgba(99,102,241,0.2)' }}>
              <span className="text-2xl">🤖</span>
            </div>
          </div>

          <p className="text-white font-display font-semibold mt-4 tracking-tight">AI Interviewer</p>
          <p className={`text-xs mt-1 font-medium tracking-wide ${speaking ? 'text-cyan-400' : aiLoading ? 'text-indigo-300' : 'text-gray-500'}`}>
            {aiLoading ? 'THINKING' : speaking ? 'SPEAKING' : 'LISTENING'}
          </p>

          {/* Caption */}
          <div className="absolute bottom-6 left-6 right-6 max-w-2xl mx-auto">
            <div className="backdrop-blur-xl bg-black/50 rounded-2xl px-5 py-4 border border-white/10 shadow-2xl">
              {aiLoading ? (
                <span className="text-gray-400 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Preparing next question...
                </span>
              ) : (
                <p className="text-gray-100 text-[15px] leading-relaxed">{spokenText || 'Connecting...'}</p>
              )}
            </div>
          </div>
        </div>

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