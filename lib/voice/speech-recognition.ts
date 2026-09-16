"use client"

export interface VoiceRecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

export class VoiceSpeechRecognition {
  private recognition: any = null
  private isListening = false
  private language = "en-US"

  constructor(language: "en" | "bn" = "en") {
    this.language = language === "bn" ? "bn-BD" : "en-US"

    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition()
        this.recognition.continuous = false
        this.recognition.interimResults = true
        this.recognition.lang = this.language
      }
    }
  }

  isSupported(): boolean {
    return this.recognition !== null
  }

  setLanguage(language: "en" | "bn") {
    this.language = language === "bn" ? "bn-BD" : "en-US"
    if (this.recognition) {
      this.recognition.lang = this.language
    }
  }

  start(onResult: (result: VoiceRecognitionResult) => void, onError?: (error: string) => void): void {
    if (!this.recognition || this.isListening) return

    this.recognition.onresult = (event: any) => {
      const last = event.results.length - 1
      const result = event.results[last]
      const transcript = result[0].transcript

      onResult({
        transcript,
        confidence: result[0].confidence,
        isFinal: result.isFinal,
      })
    }

    this.recognition.onerror = (event: any) => {
      // "no-speech" (mic timed out with no audio) and "aborted" (stop()
      // was called deliberately) are routine, expected states - not
      // failures worth alarming with a hard console error.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("[ ] Speech recognition error:", event.error)
      }
      this.isListening = false
      if (onError) {
        onError(event.error)
      }
    }

    this.recognition.onend = () => {
      this.isListening = false
    }

    try {
      this.recognition.start()
      this.isListening = true
    } catch (error) {
      console.error("[ ] Error starting speech recognition:", error)
      this.isListening = false
    }
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }

  getIsListening(): boolean {
    return this.isListening
  }
}

export class TextToSpeech {
  private synthesis: SpeechSynthesis | null = null
  private language = "en-US"

  constructor(language: "en" | "bn" = "en") {
    this.language = language === "bn" ? "bn-BD" : "en-US"

    if (typeof window !== "undefined") {
      this.synthesis = window.speechSynthesis
    }
  }

  isSupported(): boolean {
    return this.synthesis !== null
  }

  setLanguage(language: "en" | "bn") {
    this.language = language === "bn" ? "bn-BD" : "en-US"
  }

  speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }): void {
    if (!this.synthesis) return

    // Cancel any ongoing speech
    this.synthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = this.language
    utterance.rate = options?.rate || 0.9
    utterance.pitch = options?.pitch || 1
    utterance.volume = options?.volume || 1

    // Try to find a voice for the language
    const voices = this.synthesis.getVoices()
    const voice = voices.find((v) => v.lang.startsWith(this.language.split("-")[0]))
    if (voice) {
      utterance.voice = voice
    }

    this.synthesis.speak(utterance)
  }

  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel()
    }
  }
}
