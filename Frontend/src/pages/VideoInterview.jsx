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