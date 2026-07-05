import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, Send, AudioLines,
  Settings, Wifi, Circle, Pencil, Sparkles
} from 'lucide-react';
import * as faceapi from 'face-api.js';

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

  // Dynamically generated interviewer — fresh combination every session
  const generateInterviewer = () => {
    const rand = arr => arr[Math.floor(Math.random() * arr.length)];

    const femaleFirstNames = ['Priya','Ananya','Sneha','Kavya','Riya','Divya','Pooja','Nisha','Meera','Isha','Sakshi','Tanvi','Shreya','Aisha','Neha'];
    const maleFirstNames   = ['Rahul','Arjun','Vikram','Rohan','Amit','Karan','Nikhil','Aditya','Siddharth','Varun','Dev','Yash','Aman','Akash','Raj'];
    const lastNames        = ['Sharma','Verma','Nair','Joshi','Mehta','Kapoor','Reddy','Gupta','Iyer','Singh','Menon','Patel','Bose','Rao','Pillai','Malhotra'];
    const companies        = ['Google','Microsoft','Amazon','Meta','Flipkart','Swiggy','Razorpay','CRED','Zepto','PhonePe','Atlassian','Paytm','Meesho','Ola','Zomato','Adobe','Salesforce','Uber','LinkedIn','Infosys'];
    const roles            = ['Senior Engineer','Staff Engineer','Engineering Manager','Tech Lead','Principal Engineer','SDE-2','SDE-3'];

    const gender    = rand(['male', 'female']);
    const firstName = rand(gender === 'female' ? femaleFirstNames : maleFirstNames);
    const lastName  = rand(lastNames);
    const company   = rand(companies);
    const role      = rand(roles);

    return {
      name: `${firstName} ${lastName}`,
      initials: `${firstName[0]}${lastName[0]}`,
      company,
      role,
      gender,
    };
  };

  const [interviewer] = useState(() => generateInterviewer());

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [status, setStatus] = useState('Connecting to camera...');
  const [loading, setLoading] = useState(true);
  const [preCheckPassed, setPreCheckPassed] = useState(false);
  const [preCheckStatus, setPreCheckStatus] = useState('Checking camera...');
  const [preCheckError, setPreCheckError] = useState('');

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

  // --- Proctoring ---
  const [warnings, setWarnings] = useState([]);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [proctorDismissed, setProctorDismissed] = useState(false);
  const MAX_WARNINGS = 3;
  const procCanvasRef = useRef(null);
  const lastFrameRef = useRef(null);
  const lookAwayCountRef = useRef(0);
  const proctorIntervalRef = useRef(null);

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
    if (loading || status !== 'Camera ready' || preCheckPassed) return;

    const runPreCheck = async () => {
      setPreCheckStatus('Checking camera and microphone...');

      const videoTrack = streamRef.current?.getVideoTracks()[0];
      const audioTrack = streamRef.current?.getAudioTracks()[0];
      if (!videoTrack || videoTrack.readyState !== 'live') {
        setPreCheckError('Camera is not active. Please allow camera access and refresh.');
        return;
      }
      if (!audioTrack || audioTrack.readyState !== 'live') {
        setPreCheckError('Microphone is not active. Please allow mic access and refresh.');
        return;
      }

      setPreCheckStatus('Loading face detection...');
      let waited = 0;
      while (!faceModelsLoadedRef.current && waited < 8000) {
        await new Promise(r => setTimeout(r, 300));
        waited += 300;
      }
      if (!faceModelsLoadedRef.current) {
        setPreCheckError('Face detection failed to load. Please refresh and try again.');
        return;
      }

      setPreCheckStatus('Verifying your face is visible...');
      const video = videoRef.current;
      let faceOk = false;
      for (let i = 0; i < 8; i++) {
        try {
          if (video && video.readyState >= 2 && video.videoWidth > 0) {
            const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
            const result = await faceapi.detectSingleFace(video, options);
            if (result) { faceOk = true; break; }
          } else {
            console.log('⏳ video not ready yet:', { readyState: video?.readyState, videoWidth: video?.videoWidth });
          }
        } catch (err) {
          console.warn('Pre-check face detect error:', err);
        }
        await new Promise(r => setTimeout(r, 500));
      }
      if (!faceOk) {
        setPreCheckError('We could not detect your face. Please sit facing the camera in good lighting, then refresh.');
        return;
      }

      setPreCheckStatus('All checks passed!');
      setTimeout(() => setPreCheckPassed(true), 800);
    };

    runPreCheck();
  }, [loading, status, preCheckPassed]);

  // Actual interview kickoff — only after pre-check passes
  useEffect(() => {
    if (!preCheckPassed || greetedRef.current) return;
    greetedRef.current = true;
    fetchNextTurn([]);
  }, [preCheckPassed]);

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
    if (loading || interviewEnded || feedbackLoading || !preCheckPassed) return;
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

  // ── Proctoring engine — face-api.js landmark based ──
  const faceModelsLoadedRef = useRef(false);
  const prevFaceCenterRef = useRef(null);
  const movementStrikeRef = useRef(0);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        ]);
        faceModelsLoadedRef.current = true;
      } catch (err) {
        console.warn('face-api models failed to load:', err);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (loading || interviewEnded || !camOn || !preCheckPassed) return;

    const video = videoRef.current;
    if (!video) return;

    // Cooldown ref so two warnings don't fire back-to-back
    const lastWarnTimeRef = { current: 0 };
    const WARN_COOLDOWN_MS = 12000;

    const issueWarning = (msg) => {
      const now = Date.now();
      if (now - lastWarnTimeRef.current < WARN_COOLDOWN_MS) return;
      lastWarnTimeRef.current = now;
      setWarningMsg(msg);
      setShowWarning(true);
      setWarningCount(prev => {
        const next = prev + 1;
        setWarnings(w => [...w, { msg, time: new Date().toLocaleTimeString() }]);
        if (next >= MAX_WARNINGS) {
          setTimeout(() => {
            toast.error('Interview terminated due to repeated violations.');
            window.speechSynthesis.cancel();
            stopCamera();
            onBack();
          }, 6000);
        }
        return next;
      });
      setTimeout(() => setShowWarning(false), 5000);
    };

    const checkFace = async () => {
      if (!video || video.readyState < 2 || interviewEnded) return;
      if (!faceModelsLoadedRef.current) return;

      try {
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
        const result = await faceapi.detectSingleFace(video, options).withFaceLandmarks();

        // 1. No face detected
        if (!result) {
          issueWarning('⚠️ Face not visible. Please ensure your face is clearly in frame and well-lit.');
          return;
        }

        const { detection, landmarks } = result;
        const box = detection.box;
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;

        // 2. Face too small — too far from camera / not in proper position
        const faceArea = (box.width * box.height) / (vw * vh);
        console.log('📊 proctor metrics:', {
          faceArea: faceArea.toFixed(3),
          boxX: Math.round(box.x), boxY: Math.round(box.y),
          boxW: Math.round(box.width), boxH: Math.round(box.height),
          vw, vh,
          offCenterX: Math.abs(((box.x + box.width/2) / vw - 0.5)).toFixed(3),
          offCenterY: Math.abs(((box.y + box.height/2) / vh - 0.5)).toFixed(3),
          faceTopRelative: (box.y / vh).toFixed(3)
        });
        if (faceArea < 0.04) {
          issueWarning('⚠️ Please sit closer to the camera. Your face should be clearly visible.');
          return;
        }

        // 3. Face too large — too close to camera
        if (faceArea > 0.55) {
          issueWarning('⚠️ Please move a bit further from the camera for a proper interview frame.');
          return;
        }

        // 4. Face not centered — looking away or positioned off screen
        const faceCenterX = box.x + box.width / 2;
        const faceCenterY = box.y + box.height / 2;

        // 4a. Movement check — compare this face center to the last check's center
        if (prevFaceCenterRef.current) {
          const dx = Math.abs(faceCenterX - prevFaceCenterRef.current.x) / box.width;
          const dy = Math.abs(faceCenterY - prevFaceCenterRef.current.y) / box.height;
          const movement = dx + dy;
          if (movement > 0.35) {
            movementStrikeRef.current += 1;
          } else {
            movementStrikeRef.current = Math.max(0, movementStrikeRef.current - 1);
          }
          if (movementStrikeRef.current >= 2) {
            movementStrikeRef.current = 0;
            prevFaceCenterRef.current = { x: faceCenterX, y: faceCenterY };
            issueWarning('⚠️ Excessive head/body movement detected. Please stay steady and centered in frame.');
            return;
          }
        }
        prevFaceCenterRef.current = { x: faceCenterX, y: faceCenterY };
        const offCenterX = Math.abs(faceCenterX / vw - 0.5);
        const offCenterY = Math.abs(faceCenterY / vh - 0.5);
        if (offCenterX > 0.32 || offCenterY > 0.35) {
          issueWarning('⚠️ Please face the camera directly. Do not look away during the interview.');
          return;
        }

        // 5. Eye gaze — check if eyes are open and roughly level
        const leftEye  = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        const eyeCenter = (pts) => ({
          x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
          y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
        });
        const lc = eyeCenter(leftEye);
        const rc = eyeCenter(rightEye);

        // Eye height difference (head tilt)
        const eyeTilt = Math.abs(lc.y - rc.y) / box.height;
        if (eyeTilt > 0.18) {
          issueWarning('⚠️ Excessive head tilt detected. Please keep your head upright and look at the camera.');
          return;
        }

        // Eye vertical position — if eyes are in the bottom half of the face box the
        // candidate is likely looking down at their phone or notes
        const eyeAvgY = (lc.y + rc.y) / 2;
        const eyeRelY = (eyeAvgY - box.y) / box.height;
        if (eyeRelY > 0.65) {
          issueWarning('⚠️ You appear to be looking down. Please maintain eye contact with the camera.');
          return;
        }

        // 6. Attire check — use face-to-frame ratio and face vertical position
        // If the face is in the bottom quarter of the frame, they're likely slouching
        const faceTopRelative = box.y / vh;
        if (faceTopRelative > 0.55) {
          issueWarning('⚠️ Please sit upright. Your face should be in the upper-center of the frame.');
          return;
        }

        // If face is at the very top (no upper body visible), prompt proper framing
        if (faceTopRelative < 0.02 && faceArea > 0.25) {
          issueWarning('⚠️ Please adjust your camera so your upper body is visible — not just your face.');
          return;
        }

      } catch (err) {
        console.warn('Proctor check error:', err);
      }
    };

    proctorIntervalRef.current = setInterval(checkFace, 8000);
    return () => clearInterval(proctorIntervalRef.current);
  }, [loading, interviewEnded, camOn, preCheckPassed]);

  // Warn immediately when candidate turns camera off mid-interview
  useEffect(() => {
    if (!camOn && !loading && !interviewEnded && currentQuestion) {
      setWarningMsg('⚠️ Camera turned off. Camera must stay on during the interview.');
      setShowWarning(true);
      setWarningCount(prev => {
        const next = prev + 1;
        setWarnings(w => [...w, { msg: 'Camera turned off', time: new Date().toLocaleTimeString() }]);
        if (next >= MAX_WARNINGS) {
          setTimeout(() => {
            toast.error('Interview terminated — camera kept off repeatedly.');
            window.speechSynthesis.cancel();
            stopCamera();
            onBack();
          }, 6000);
        }
        return next;
      });
      setTimeout(() => setShowWarning(false), 5000);
    }
  }, [camOn]);

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
      setStatus('Camera ready');
      setLoading(false);
    } catch {
      toast.error('Camera/mic access denied');
      setStatus('Camera access denied');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [loading, preCheckPassed]);

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

    // Pick a voice matching the interviewer's gender
    const voices = window.speechSynthesis.getVoices();
    const isFemale = interviewer.gender === 'female';
    const preferred = voices.filter(v =>
      v.lang.startsWith('en') &&
      (isFemale
        ? /female|woman|zira|samantha|victoria|karen|moira|tessa|fiona|veena|susan|google uk english female|google us english/i.test(v.name)
        : /male|man|david|mark|daniel|alex|fred|thomas|rishi|google uk english male/i.test(v.name))
    );
    // Fallback: any English voice, then whatever is available
    const fallback = voices.filter(v => v.lang.startsWith('en'));
    const picked = preferred[0] || fallback[0] || voices[0];
    if (picked) utterance.voice = picked;
    utterance.pitch = isFemale ? 1.15 : 0.9;

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
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-semibold tracking-tight">Live Interview</span>
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

        {/* ===== Pre-Interview Check ===== */}
        {!loading && !preCheckPassed && (
          <div className="rounded-3xl p-10 flex flex-col items-center justify-center gap-4 text-center"
            style={{ minHeight: '520px', background: 'radial-gradient(120% 100% at 50% 0%, #161a2e 0%, #0a0b14 55%, #060710 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Video must be mounted during pre-check too, so videoRef.current exists for face detection */}
            <video
              ref={videoRef}
              autoPlay muted playsInline
              className="absolute w-1 h-1 opacity-0 pointer-events-none"
            />
            {preCheckError ? (
              <>
                <span className="text-4xl">🚫</span>
                <p className="text-red-400 font-semibold max-w-md">{preCheckError}</p>
                <button onClick={() => window.location.reload()}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 transition-all">
                  Refresh and Try Again
                </button>
              </>
            ) : (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="text-gray-300 font-medium">{preCheckStatus}</p>
                <p className="text-gray-600 text-xs">Please stay in frame, facing the camera</p>
              </>
            )}
          </div>
        )}
        {preCheckPassed && (
        <div className="relative rounded-3xl overflow-hidden"
          style={{
            minHeight: '520px',
            background: 'radial-gradient(120% 100% at 50% 0%, #161a2e 0%, #0a0b14 55%, #060710 100%)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
          <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 0 0 80px 20px rgba(0,0,0,0.7)' }} />

          {/* ── Side-by-side tiles: Interviewer (left) | Candidate (right) ── */}
          <div className="absolute inset-0 flex items-stretch gap-2 p-3" style={{ zIndex: 1 }}>

            {/* LEFT — Interviewer tile */}
            <div className="flex-1 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center"
              style={{
                background: 'linear-gradient(160deg,#141c33 0%,#0d1120 100%)',
                border: speaking
                  ? '2px solid rgba(99,102,241,0.7)'
                  : '1.5px solid rgba(255,255,255,0.07)',
                boxShadow: speaking ? '0 0 40px rgba(99,102,241,0.3) inset' : 'none',
                transition: 'border 0.3s ease, box-shadow 0.3s ease'
              }}>

              {/* Ambient blob behind avatar */}
              <div className="absolute w-48 h-48 rounded-full blur-3xl opacity-20"
                style={{ background: speaking ? '#6366f1' : '#1e2a5a', transition: 'background 0.5s' }} />

              {/* Professional initials avatar */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="relative">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white select-none"
                    style={{
                      background: 'linear-gradient(135deg,#312e81,#4f46e5)',
                      boxShadow: speaking
                        ? '0 0 0 4px rgba(99,102,241,0.5), 0 0 40px rgba(99,102,241,0.4)'
                        : '0 0 0 2px rgba(255,255,255,0.1)',
                      transition: 'box-shadow 0.35s ease',
                      fontSize: 36,
                      letterSpacing: '-1px'
                    }}
                  >
                    {interviewer.initials}
                  </div>
                  {/* Speaking waveform ring */}
                  {speaking && (
                    <>
                      <span className="absolute inset-0 rounded-full border-2 border-indigo-400/50 animate-ping" />
                      <span className="absolute -inset-2 rounded-full border border-indigo-400/20 animate-pulse" />
                    </>
                  )}
                  {/* Live mic dot */}
                  {speaking && (
                    <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-[#0d1120] flex items-center justify-center">
                      <Mic className="w-2 h-2 text-white" />
                    </span>
                  )}
                </div>

                {/* Waveform bars when speaking */}
                <div className="flex items-end gap-0.5 h-5">
                  {[0,1,2,3,4].map(i => (
                    <span key={i}
                      className="w-1 rounded-full"
                      style={{
                        background: speaking ? '#818cf8' : 'rgba(255,255,255,0.12)',
                        height: speaking ? `${10 + Math.abs(Math.sin(i * 1.3)) * 10}px` : '4px',
                        animation: speaking ? `barwave 0.7s ${i * 0.1}s infinite alternate ease-in-out` : 'none',
                        transition: 'height 0.2s, background 0.3s'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Name tag — bottom left */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
                {speaking && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
                {aiLoading && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
                <span className="text-white text-xs font-semibold">{interviewer.name}</span>
                <span className="text-gray-500 text-[10px] hidden sm:inline">· {interviewer.company}</span>
              </div>
            </div>

            {/* RIGHT — Candidate tile */}
            <div className="flex-1 rounded-2xl relative overflow-hidden bg-black flex flex-col items-center justify-center"
              style={{
                border: listening
                  ? '2px solid rgba(239,68,68,0.6)'
                  : '1.5px solid rgba(255,255,255,0.07)',
                boxShadow: listening ? '0 0 30px rgba(239,68,68,0.2) inset' : 'none',
                transition: 'border 0.3s, box-shadow 0.3s'
              }}>
              {loading && (
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs">Starting camera...</span>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay muted playsInline
                className={`w-full h-full object-cover ${loading || !camOn ? 'hidden' : ''}`}
              />
              {!camOn && !loading && (
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-xl font-bold text-gray-400">
                    {candidateName ? candidateName[0].toUpperCase() : 'Y'}
                  </div>
                  <span className="text-xs text-gray-600">Camera off</span>
                </div>
              )}
              {/* Name tag */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
                {listening && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                <span className="text-white text-xs font-semibold">{candidateName || 'You'}</span>
              </div>
            </div>{/* END RIGHT candidate tile */}
          </div>{/* END side-by-side flex */}

          {/* Captions — bottom center */}
          {(spokenText || aiLoading || nudgeText) && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[94%] max-w-2xl" style={{ zIndex: 4 }}>
              <div className="rounded-xl px-6 py-3 text-center"
                style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {aiLoading ? (
                  <span className="flex items-center justify-center gap-1.5">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </span>
                ) : nudgeText ? (
                  <p className="text-indigo-300 italic text-sm leading-relaxed">{nudgeText}</p>
                ) : (
                  <p className="text-white text-sm sm:text-base leading-relaxed font-medium">{spokenText}</p>
                )}
              </div>
            </div>
          )}

          <style>{`
            @keyframes barwave { from { transform: scaleY(0.5); } to { transform: scaleY(1.5); } }
            @keyframes bounce { from { transform: scaleY(0.6); } to { transform: scaleY(1.4); } }
            @keyframes warningSlide { from { opacity:0; transform:translate(-50%,-10px); } to { opacity:1; transform:translate(-50%,0); } }
          `}</style>

          {/* ── Proctoring warning overlay ── */}
          {showWarning && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
              style={{ animation: 'warningSlide 0.3s ease', minWidth: 320, maxWidth: '90%' }}>
              <div className="rounded-xl px-5 py-3 flex items-start gap-3"
                style={{ background: 'rgba(220,38,38,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,100,100,0.4)', boxShadow: '0 0 30px rgba(220,38,38,0.4)' }}>
                <span className="text-2xl mt-0.5">🚨</span>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold leading-snug">{warningMsg}</p>
                  <p className="text-red-200 text-xs mt-1">
                    Warning {Math.min(warningCount, MAX_WARNINGS)} of {MAX_WARNINGS}
                    {warningCount >= MAX_WARNINGS ? ' — Interview will be terminated.' : ' — Further violations will end the interview.'}
                  </p>
                </div>
                <button onClick={() => { setShowWarning(false); setProctorDismissed(false); }}
                  className="text-red-200 hover:text-white text-lg leading-none mt-0.5">✕</button>
              </div>
            </div>
          )}

          {/* Warning count badge on candidate tile — subtle indicator */}
          {warningCount > 0 && !interviewEnded && (
            <div className="absolute top-4 left-4 z-10">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(220,38,38,0.8)', color: 'white', backdropFilter: 'blur(8px)' }}>
                ⚠️ {warningCount}/{MAX_WARNINGS} warnings
              </span>
            </div>
          )}

          {/* Bottom controls — centered, Meet-style */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3" style={{ zIndex: 5 }}>
            <button
              onClick={toggleMic}
              aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
              className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 ${micOn ? 'border-white/15 bg-white/5 text-gray-200 hover:border-indigo-400/40' : 'bg-red-500/20 border-red-500/40 text-red-400'}`}
              style={{ backdropFilter: 'blur(12px)' }}
            >
              {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleCam}
              aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
              className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 ${camOn ? 'border-white/15 bg-white/5 text-gray-200 hover:border-indigo-400/40' : 'bg-red-500/20 border-red-500/40 text-red-400'}`}
              style={{ backdropFilter: 'blur(12px)' }}
            >
              {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button
              onClick={endCall}
              aria-label="Leave interview"
              className="w-11 h-11 rounded-full flex items-center justify-center bg-red-500/90 text-white hover:bg-red-500 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-red-400/60"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
            <button
              onClick={openSettings}
              aria-label="Settings"
              className="w-11 h-11 rounded-full flex items-center justify-center border border-white/15 bg-white/5 text-gray-300 hover:border-indigo-400/40 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
        )}{/* END Interview Stage */}

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