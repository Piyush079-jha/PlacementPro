import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, Send, Bot, AudioLines } from 'lucide-react';

export default function VideoInterview({ onBack, role = 'Full Stack Developer', difficulty = 'Medium', type = 'mixed', totalQuestions = 5 }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [status, setStatus] = useState('Connecting to camera...');
  const [loading, setLoading] = useState(true);

  // AI interviewer state
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
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setAnswer(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Voice input not supported in this browser. Try Chrome.');
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setAnswer('');
      recognitionRef.current.start();
      setListening(true);
    }
  };
//   const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (!loading && status === 'Camera ready') {
      fetchNextTurn([]);
    }
  }, [loading]);

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
        role, difficulty, type,
        history: updatedHistory,
        turnNumber: updatedHistory.length,
        totalQuestions
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

  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const submitAnswer = async () => {
    if (!answer.trim() || answer.trim().length < 5) return toast.error('Please answer before continuing');
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
      } catch (err) {
        toast.error('Failed to generate final feedback');
      } finally {
        setFeedbackLoading(false);
      }
    } else {
      fetchNextTurn(newHistory);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus('Camera ready');
      setLoading(false);
    } catch (err) {
      toast.error('Camera/mic access denied');
      setStatus('Camera access denied');
      setLoading(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
  };

  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled); }
  };

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
  };

  const endCall = () => {
    stopCamera();
    onBack();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Video Interview</h1>
        <p className="text-gray-500">{status}</p>
      </div>

      {/* Main call stage */}
      <div className="card relative aspect-video bg-black/50 overflow-hidden p-0">
        {/* AI Interviewer — main screen */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#0d1117] to-[#161b22]">
          <div className="relative">
            <div className={`w-28 h-28 rounded-full bg-primary-500/15 border-2 border-primary-500/30 flex items-center justify-center transition-all ${speaking ? 'scale-110 shadow-[0_0_40px_rgba(59,130,246,0.4)]' : ''}`}>
              <Bot className="w-12 h-12 text-primary-400" />
            </div>
            {speaking && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-primary-400/40 animate-ping" />
                <span className="absolute -inset-3 rounded-full border border-primary-400/20 animate-pulse" />
              </>
            )}
          </div>
          <p className="text-white font-display font-semibold mt-4">AI Interviewer</p>
          <p className="text-gray-500 text-xs mt-1">
            {aiLoading ? 'Thinking...' : speaking ? 'Speaking...' : 'Listening'}
          </p>

          {/* Live caption style question */}
          <div className="absolute bottom-6 left-6 right-6 max-w-2xl mx-auto">
            <div className="bg-black/60 backdrop-blur-md rounded-xl px-5 py-3 border border-white/10">
              {aiLoading ? (
                <span className="text-gray-400 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Preparing next question...
                </span>
              ) : (
                <p className="text-white text-sm leading-relaxed">{spokenText || 'Connecting...'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Your camera — small corner box, Zoom-style */}
        <div className="absolute top-4 right-4 w-40 sm:w-52 aspect-video rounded-lg overflow-hidden border border-white/15 shadow-lg bg-black">
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
            className={`w-full h-full object-cover ${loading ? 'hidden' : ''}`}
          />
          <span className="absolute bottom-1 left-1.5 text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded">You</span>
        </div>

        {/* Live status badge instead of progress count */}
        <div className="absolute top-4 left-4">
          <span className="badge bg-black/50 text-gray-300 border border-white/10 text-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live Interview
          </span>
        </div>
      </div>

      {/* Answer panel */}
      {!loading && !interviewEnded && (
        <div className="card border border-primary-500/15 space-y-3">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Your Answer</label>
            <button
              onClick={toggleListening}
              disabled={aiLoading}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all ${listening ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'border-primary-500/30 text-primary-400 hover:bg-primary-500/10'}`}
            >
              {listening ? <AudioLines className="w-3.5 h-3.5 animate-pulse" /> : <Mic className="w-3.5 h-3.5" />}
              {listening ? 'Listening...' : 'Speak Answer'}
            </button>
          </div>
          <textarea
            className="input-field min-h-28 resize-none"
            placeholder="Click 'Speak Answer' or type here..."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            disabled={aiLoading}
          />
          <button
            onClick={() => { if (listening) toggleListening(); submitAnswer(); }}
            disabled={aiLoading || !answer.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> {isLastQuestion ? 'Finish Interview' : 'Submit Answer'}
          </button>
        </div>
      )}

      {interviewEnded && (
        <div className="card space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-display font-bold text-white">Interview Complete 🎉</h2>
            <p className="text-gray-400 text-sm">Here's your detailed performance review</p>
          </div>

          {feedbackLoading && (
            <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Analyzing your performance...</span>
            </div>
          )}

          {feedback && (
            <>
              <div className="text-center">
                <div className="text-5xl font-display font-bold text-gradient-blue mb-1">{feedback.overallScore}%</div>
                <p className="text-gray-500 text-sm">Overall Score</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Communication', feedback.communicationScore],
                  ['Technical', feedback.technicalScore],
                  ['Problem Solving', feedback.problemSolvingScore],
                  ['Confidence', feedback.confidenceScore],
                ].map(([label, score]) => (
                  <div key={label} className="bg-white/3 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-white">{score}/10</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <p className="text-gray-300 text-sm leading-relaxed bg-white/3 rounded-lg p-4">{feedback.summary}</p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-green-400 mb-2 uppercase tracking-wide">Strengths</p>
                  <ul className="space-y-1.5">
                    {feedback.strengths?.map((s, i) => <li key={i} className="text-sm text-gray-400 pl-3 border-l-2 border-green-500/30">{s}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-yellow-400 mb-2 uppercase tracking-wide">Areas to Improve</p>
                  <ul className="space-y-1.5">
                    {feedback.weaknesses?.map((w, i) => <li key={i} className="text-sm text-gray-400 pl-3 border-l-2 border-yellow-500/30">{w}</li>)}
                  </ul>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-primary-400 mb-2 uppercase tracking-wide">Actionable Tips</p>
                <ul className="space-y-1.5">
                  {feedback.actionableTips?.map((t, i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-primary-400">→</span>{t}</li>)}
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${micOn ? 'border-white/10 text-gray-300 hover:border-primary-500/30' : 'bg-red-500/15 border-red-500/30 text-red-400'}`}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleCam}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${camOn ? 'border-white/10 text-gray-300 hover:border-primary-500/30' : 'bg-red-500/15 border-red-500/30 text-red-400'}`}
        >
          {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={endCall}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}