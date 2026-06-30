import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from 'lucide-react';

export default function VideoInterview({ onBack }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [status, setStatus] = useState('Connecting to camera...');
  const [loading, setLoading] = useState(true);

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

  const submitAnswer = () => {
    if (!answer.trim() || answer.trim().length < 5) return toast.error('Please answer before continuing');
    const newHistory = [...history, { question: currentQuestion, answer }];
    setHistory(newHistory);
    setAnswer('');
    if (isLastQuestion) {
      setInterviewEnded(true);
      window.speechSynthesis.cancel();
      toast.success('Interview complete!');
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

      <div className="card relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
        {loading && (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Setting up your camera...</span>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover rounded-xl ${loading ? 'hidden' : ''}`}
        />
      </div>

      {!loading && !interviewEnded && (
        <div className="card border border-primary-500/15 space-y-3">
          <div className="flex items-center gap-2">
            <span className="badge bg-primary-500/15 text-primary-400 text-xs">
              Question {turnNumber + 1}/{totalQuestions}
            </span>
            {aiLoading && <span className="text-xs text-gray-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Interviewer thinking...</span>}
          </div>
          <p className="text-white text-lg leading-relaxed font-medium">
            {spokenText || 'Loading first question...'}
          </p>

          <textarea
            className="input-field min-h-28 resize-none"
            placeholder="Speak or type your answer here..."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            disabled={aiLoading}
          />
          <button
            onClick={submitAnswer}
            disabled={aiLoading || !answer.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> {isLastQuestion ? 'Finish Interview' : 'Submit Answer'}
          </button>
        </div>
      )}

      {interviewEnded && (
        <div className="card text-center space-y-2">
          <h2 className="text-xl font-display font-bold text-white">Interview Complete 🎉</h2>
          <p className="text-gray-400 text-sm">Great job! You answered {history.length} questions.</p>
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