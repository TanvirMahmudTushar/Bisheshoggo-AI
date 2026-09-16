"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/api/auth-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Video, Loader2, Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function TelemedicinePage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isDoctorSpeaking, setIsDoctorSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Initialize speech synthesis
    if (typeof window !== 'undefined') {
      synthesisRef.current = window.speechSynthesis;
      
      // Load voices (needed for some browsers)
      const loadVoices = () => {
        if (synthesisRef.current) {
          const voices = synthesisRef.current.getVoices();
          console.log('Available voices loaded:', voices.length);
          const bengaliVoices = voices.filter((v: SpeechSynthesisVoice) => v.lang.startsWith('bn') || v.lang.startsWith('hi'));
          console.log('Bengali/Hindi voices:', bengaliVoices.map((v: SpeechSynthesisVoice) => `${v.name} (${v.lang})`));
        }
      };
      
      // Load voices immediately
      loadVoices();
      
      // Also load when voices change (for Chrome)
      if (synthesisRef.current) {
        synthesisRef.current.onvoiceschanged = loadVoices;
      }
      
      // Initialize speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'bn-BD'; // Bengali (Bangladesh)

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          // "no-speech" (mic timed out with no audio) and "aborted" (we
          // called .stop() ourselves) are routine, expected states - not
          // failures worth alarming with a hard console error. Only genuine
          // problems (permission denied, no mic, network, etc.) get logged.
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.error('Speech recognition error:', event.error);
          }
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        // Stop any existing recognition before starting
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
        
        // Small delay to ensure previous recognition is stopped
        setTimeout(() => {
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (error) {
            console.error('Failed to start speech recognition:', error);
            setIsListening(false);
          }
        }, 100);
      } catch (error) {
        console.error('Speech recognition error:', error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
        setIsListening(false);
      }
    }
  };

  const speakText = (text: string) => {
    if (synthesisRef.current && voiceEnabled) {
      // Cancel any ongoing speech
      synthesisRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'bn-BD'; // Bengali language
      utterance.rate = 0.75; // Slower
      utterance.pitch = 0.4; // VERY LOW pitch for definitely male voice
      utterance.volume = 1;
      
      // Get all available voices
      const voices = synthesisRef.current.getVoices();
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('ALL AVAILABLE VOICES:');
      voices.forEach((v: SpeechSynthesisVoice, i: number) => console.log(`${i + 1}. ${v.name} (${v.lang}) ${v.localService ? '[Local]' : '[Remote]'}`));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Filter out FEMALE voices explicitly
const nonFemaleVoices = voices.filter((voice: SpeechSynthesisVoice) =>
        !voice.name.toLowerCase().includes('female') &&
        !voice.name.toLowerCase().includes('woman') &&
        !voice.name.toLowerCase().includes('girl')
      );
      
      console.log('Non-female voices:', nonFemaleVoices.map((v: SpeechSynthesisVoice) => v.name).join(', '));
      
      let selectedVoice = null;
      
      // Priority 1: Google Bengali (non-female)
      selectedVoice = nonFemaleVoices.find((voice: SpeechSynthesisVoice) => 
        voice.name.toLowerCase().includes('google') && 
        voice.lang.startsWith('bn')
      );
      if (selectedVoice) console.log('✅ Priority 1: Google Bengali ->', selectedVoice.name);
      
      // Priority 2: Any Bengali (non-female)
      if (!selectedVoice) {
        selectedVoice = nonFemaleVoices.find((voice: SpeechSynthesisVoice) => voice.lang.startsWith('bn'));
        if (selectedVoice) console.log('✅ Priority 2: Any Bengali ->', selectedVoice.name);
      }
      
      // Priority 3: Google Hindi (non-female)
      if (!selectedVoice) {
        selectedVoice = nonFemaleVoices.find((voice: SpeechSynthesisVoice) => 
          voice.name.toLowerCase().includes('google') && 
          voice.lang.startsWith('hi')
        );
        if (selectedVoice) console.log('✅ Priority 3: Google Hindi ->', selectedVoice.name);
      }
      
      // Priority 4: Any Hindi (non-female)
      if (!selectedVoice) {
        selectedVoice = nonFemaleVoices.find((voice: SpeechSynthesisVoice) => voice.lang.startsWith('hi'));
        if (selectedVoice) console.log('✅ Priority 4: Any Hindi ->', selectedVoice.name);
      }
      
      // Priority 5: First non-female voice as absolute fallback
      if (!selectedVoice && nonFemaleVoices.length > 0) {
        selectedVoice = nonFemaleVoices[0];
        console.log('✅ Priority 5: First non-female ->', selectedVoice.name);
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎤 USING VOICE:', selectedVoice.name);
        console.log('📍 Language:', selectedVoice.lang);
        console.log('🔊 Pitch:', utterance.pitch, '(Very low for male voice)');
        console.log('⚡ Rate:', utterance.rate);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } else {
        console.log('⚠️ WARNING: Using default voice (may be female)');
        console.log('💡 TIP: Install Bengali voices in your browser/OS');
      }
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log('Speech started');
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('Speech ended');
      };
      
      utterance.onerror = (event) => {
        setIsSpeaking(false);
        console.error('Speech error:', event.error);
      };
      
      try {
        synthesisRef.current.speak(utterance);
        console.log('Speaking:', text.substring(0, 50) + '...');
      } catch (error) {
        console.error('Failed to speak:', error);
        setIsSpeaking(false);
      }
    } else {
      console.log('Speech synthesis not available or voice disabled');
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (synthesisRef.current && !voiceEnabled) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const startCall = () => {
    setIsCallActive(true);
    const welcomeMessage = "আসসালামু আলাইকুম! আমি ডাঃ Fariha, বিশেষজ্ঞ AI থেকে। আপনাদের সেবায় সর্বদা নিয়োজিত। আপনার স্বাস্থ্য সমস্যা নিয়ে আমি আপনাকে সাহায্য করতে পারি। আজ আমি কিভাবে আপনাকে সাহায্য করতে পারি?";
    
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: welcomeMessage,
        timestamp: new Date(),
      },
    ]);
    
    // Start video
    if (videoRef.current) {
      videoRef.current.play();
    }
    
    // Don't speak welcome message - only speak when user sends prompts
  };

  const endCall = () => {
    setIsCallActive(false);
    setMessages([]);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
    }
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setIsSpeaking(false);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);
    setIsDoctorSpeaking(true);

    // Make video loop while speaking
    if (videoRef.current) {
      videoRef.current.loop = true;
      videoRef.current.play();
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/ai/chat/simple`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('bisheshoggo_token') || ''}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "You are Dr. Fariha, a compassionate and knowledgeable AI medical doctor providing telemedicine consultations for patients in Bangladesh's Hill Tracts and rural regions. আপনাদের সেবায় সর্বদা নিয়োজিত (Always dedicated to your service). Provide professional medical advice, ask relevant questions, and show empathy. If the condition is serious, recommend seeing a doctor in person. Keep responses concise but informative. You can use Bengali phrases when appropriate to make patients feel comfortable."
            },
            ...messages.map((m: Message) => ({
              role: m.role,
              content: m.content,
            })),
            {
              role: "user",
              content: input,
            }
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from doctor");
      }

      const data = await response.json();

      const doctorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content || "I apologize, I couldn't process that. Could you please repeat?",
        timestamp: new Date(),
      };

      setMessages((prev: Message[]) => [...prev, doctorMessage]);
      
      // Speak the doctor's response
      if (voiceEnabled) {
        speakText(doctorMessage.content);
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "দুঃখিত, আমি এই মুহূর্তে সংযোগ করতে সমস্যা হচ্ছে। অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।",
        timestamp: new Date(),
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
      
      if (voiceEnabled) {
        speakText(errorMessage.content);
      }
    } finally {
      setIsSending(false);
      setIsDoctorSpeaking(false);
      
      // Stop looping video after speaking
      if (videoRef.current) {
        videoRef.current.loop = false;
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 bg-linear-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              <Video className="h-10 w-10 text-emerald-600" />
              Telemedicine
            </h1>
            <p className="text-2xl font-semibold text-slate-700 dark:text-slate-300 mt-2 ml-14">
              আপনাদের সেবায় সর্বদা নিয়োজিত
            </p>
            <p className="text-muted-foreground ml-14 mt-1">
              Real-time medical consultation with Dr. Fariha • Available 24/7
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Video Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <Card className="overflow-hidden border-2 border-emerald-500/20 shadow-xl">
            <CardHeader className="bg-linear-to-br from-emerald-600 via-teal-600 to-blue-600 text-white">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                    <span className="text-2xl">👨‍⚕️</span>
                  </div>
                  <span className="text-xl font-bold">Dr. Fariha</span>
                </div>
                {isCallActive && (
                  <span className="flex items-center gap-2 text-sm bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    Live
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative aspect-3/4 bg-slate-900">
                {isCallActive ? (
                  <>
                    <video
                      ref={videoRef}
                      src="/doctor.mp4"
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    {isDoctorSpeaking && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute bottom-4 left-4 right-4"
                      >
                        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-1 h-4 bg-green-500 animate-pulse" style={{ animationDelay: "0ms" }}></div>
                              <div className="w-1 h-4 bg-green-500 animate-pulse" style={{ animationDelay: "150ms" }}></div>
                              <div className="w-1 h-4 bg-green-500 animate-pulse" style={{ animationDelay: "300ms" }}></div>
                            </div>
                            <span>Dr. is speaking...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="mb-6"
                    >
                      <div className="w-32 h-32 rounded-full bg-linear-to-br from-emerald-500 via-teal-500 to-blue-500 flex items-center justify-center mb-6 shadow-2xl">
                        <span className="text-6xl">👨‍⚕️</span>
                      </div>
                      <h3 className="text-2xl font-bold mb-2 bg-linear-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                        Dr. Fariha
                      </h3>
                      <p className="text-base text-emerald-300 font-medium">
                        AI Medical Specialist
                      </p>
                      <p className="text-sm text-slate-400 mt-3 px-4">
                        আপনাদের সেবায় সর্বদা নিয়োজিত
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2 bg-green-500/20 backdrop-blur px-4 py-2 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-300">Available 24/7</span>
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-linear-to-br from-emerald-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 space-y-2">
                {!isCallActive ? (
                  <Button
                    onClick={startCall}
                    className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg"
                    size="lg"
                  >
                    <Phone className="mr-2 h-5 w-5" />
                    Start Consultation with Dr. Fariha
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={endCall}
                      variant="destructive"
                      className="w-full shadow-lg"
                      size="lg"
                    >
                      <PhoneOff className="mr-2 h-5 w-5" />
                      End Consultation
                    </Button>
                    <Button
                      onClick={toggleVoice}
                      variant="outline"
                      className="w-full border-emerald-500/50 hover:bg-emerald-50"
                      size="sm"
                    >
                      {voiceEnabled ? (
                        <>
                          <Volume2 className="mr-2 h-4 w-4 text-emerald-600" />
                          Voice On
                        </>
                      ) : (
                        <>
                          <VolumeX className="mr-2 h-4 w-4" />
                          Voice Off
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {isCallActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="mt-4 border-emerald-500/20 bg-linear-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-900">
                
              </Card>
            </motion.div>
          )}
        </motion.div>

        {/* Chat Section */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="h-[calc(100vh-12rem)] flex flex-col border-2 border-emerald-500/20 shadow-xl">
            <CardHeader className="border-b bg-linear-to-r from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">💬</span>
                Consultation Chat with Dr. Fariha
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 bg-linear-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
              {!isCallActive ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="w-24 h-24 rounded-full bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-6 shadow-xl">
                      <Video className="h-12 w-12 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      Start a consultation to chat with Dr. Fariha
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Click "Start Consultation" to begin your telemedicine session with our AI medical specialist
                    </p>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {messages.map((message: Message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                          <div
                          className={`max-w-[80%] rounded-2xl p-4 shadow-md ${
                            message.role === "user"
                              ? "bg-linear-to-br from-emerald-600 to-teal-600 text-white"
                              : "bg-white dark:bg-slate-800 border-2 border-emerald-500/20"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {message.role === "assistant" && (
                              <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shrink-0">
                                <span className="text-lg">👨‍⚕️</span>
                              </div>
                            )}
                            <div className="flex-1">
                              {message.role === "assistant" && (
                                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Dr. Fariha</p>
                              )}
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                              <p className="text-xs opacity-70 mt-2">
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {isSending && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white dark:bg-slate-800 border-2 border-emerald-500/20 rounded-2xl p-4 shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg">
                            <span className="text-lg">👨‍⚕️</span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Dr. Fariha</p>
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </CardContent>
            
            {isCallActive && (
              <div className="border-t bg-linear-to-r from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 p-4">
                <div className="flex gap-2">
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      value={input}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                      placeholder="আপনার লক্ষণ বর্ণনা করুন বা ডাঃ Farihaকে প্রশ্ন করুন... (বাংলায় লিখুন)"
                      className="min-h-15 resize-none flex-1 border-2 border-emerald-500/20 focus:border-emerald-500"
                      onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={isSending || isListening}
                    />
                    <Button
                      onClick={isListening ? stopListening : startListening}
                      disabled={isSending}
                      size="icon"
                      variant={isListening ? "destructive" : "outline"}
                      className={`h-15 w-15 shrink-0 ${!isListening ? 'border-2 border-emerald-500/50 hover:bg-emerald-50' : ''}`}
                      title={isListening ? "Stop listening" : "Voice input"}
                    >
                      {isListening ? (
                        <MicOff className="h-5 w-5 animate-pulse" />
                      ) : (
                        <Mic className="h-5 w-5 text-emerald-600" />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isSending}
                    size="icon"
                    className="h-15 w-15 shrink-0 bg-linear-to-br from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg"
                  >
                    {isSending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                {isListening && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2 flex items-center gap-2 font-medium">
                    <Mic className="h-3 w-3 animate-pulse text-red-500" />
                    🎤 শুনছি... এখন বাংলায় বলুন
                  </p>
                )}
                {isSpeaking && (
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-2 flex items-center gap-2 font-medium">
                    <Volume2 className="h-3 w-3 animate-pulse text-blue-500" />
                    🔊 ডাঃ Fariha কথা বলছেন...
                  </p>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
