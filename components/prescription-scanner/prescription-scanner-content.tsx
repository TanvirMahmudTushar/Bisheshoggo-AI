"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { MedicineSuggestions } from "./medicine-suggestions"
import { createWorker } from "tesseract.js"
import { ocrApi } from "@/lib/api/client"

interface ExtractedData {
  medicines: Array<{
    name: string
    dosage: string
    frequency: string
    duration: string
  }>
  doctorName?: string
  date?: string
  diagnosis?: string
  rawText: string
}

export function PrescriptionScannerContent() {
  const [image, setImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const parseMedicines = (text: string): ExtractedData["medicines"] => {
    const medicines: ExtractedData["medicines"] = []
    const lines = text.split("\n")

    // Prefix that marks a line as a medicine entry: a numbered/bulleted list
    // item, a "Tab/Cap/Syp/Inj" abbreviation, or a "Medicine:"/"Rx:" label.
    const linePrefixPattern = /^(?:\d+[.)]\s+|[•*]\s+|(?:tab|cap|syp|inj)\.?\s+|(?:medicine[s]?|rx)[\s:]+)/i
    const strengthPattern = /(\d+(?:\.\d+)?\s*(?:mg|ml|g))\b/i
    const frequencyPattern = /(\d+\+\d+\+\d+|\d+\s*(?:times?|x)\s*(?:daily|day|per day))/i
    const durationPattern = /(?:for\s+)?(\d+\s*(?:days?|weeks?|months?))/i

    const looksLikeMedicineLine = (line: string) =>
      linePrefixPattern.test(line) || /\b(?:tab|cap|syp|inj)\.?\s+[a-z]/i.test(line)

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || line.length < 3 || !looksLikeMedicineLine(line)) continue

      const withoutPrefix = line.replace(linePrefixPattern, "").trim()

      // The medicine name is everything up to the first " - " separator or
      // the first dosage strength (e.g. "500mg") that follows it.
      const stopMatch = withoutPrefix.match(/\s-\s|\s+\d+(?:\.\d+)?\s*(?:mg|ml|g)\b/i)
      const name = (stopMatch ? withoutPrefix.slice(0, stopMatch.index) : withoutPrefix).trim()
      if (!name || name.length < 2) continue

      const strengthMatch = withoutPrefix.match(strengthPattern)
      const frequencyMatch = line.match(frequencyPattern)
      const durationMatch = line.match(durationPattern)

      medicines.push({
        name,
        dosage: strengthMatch ? strengthMatch[1] : "",
        frequency: frequencyMatch ? frequencyMatch[1] : "",
        duration: durationMatch ? durationMatch[1] : "",
      })
    }

    // Fallback: if still no medicines, try to extract any meaningful words after keywords
    if (medicines.length === 0) {
      const medicineKeywords = ['medicine', 'tablet', 'capsule', 'syrup', 'injection', 'rx', 'medication']
      for (const line of lines) {
        const lowerLine = line.toLowerCase()
        for (const keyword of medicineKeywords) {
          if (lowerLine.includes(keyword)) {
            const parts = line.split(/[:\-]/);
            if (parts.length > 1) {
              const medName = parts[1].trim()
              if (medName.length > 2) {
                medicines.push({
                  name: medName,
                  dosage: "",
                  frequency: "",
                  duration: "",
                })
              }
            }
          }
        }
        
        // Also check for numbered/bulleted lists
        if (/^\d+[.)]\s+/i.test(line) || /^[•\-*]\s+/i.test(line)) {
          const medName = line.replace(/^\d+[.)]\s+|^[•\-*]\s+/, "").trim()
          if (medName.length > 3 && !medicines.some(m => m.name === medName)) {
            medicines.push({
              name: medName,
              dosage: "",
              frequency: "",
              duration: "",
            })
          }
        }
      }
    }

    return medicines
  }

  const extractDoctorName = (text: string): string | undefined => {
    const doctorPattern = /dr\.?\s+([a-z\s.]+?)(?:\n|mbbs|md|ms|frcs)/gi
    const match = text.match(doctorPattern)
    return match ? match[0].trim() : undefined
  }

  const extractDiagnosis = (text: string): string | undefined => {
    const diagnosisPattern = /(?:diagnosis|dx)[\s:]+([^\n]+)/gi
    const match = text.match(diagnosisPattern)
    return match ? match[0].replace(/(?:diagnosis|dx)[\s:]+/gi, "").trim() : undefined
  }

  const extractDate = (text: string): string | undefined => {
    const datePattern = /(?:date[\s:]+)?(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/gi
    const match = text.match(datePattern)
    return match ? match[0].replace(/date[\s:]+/gi, "").trim() : undefined
  }

  const processImage = useCallback(
    async (file: File) => {
      setIsProcessing(true)
      setError(null)
      setOcrProgress(0)

      try {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        await new Promise((resolve) => {
          reader.onload = resolve
        })
        const base64Image = reader.result as string
        setImage(base64Image)

        // Prefer the real backend OCR (Gemini Vision actually reads the image);
        // fall back to on-device Tesseract.js when offline or the backend call fails.
        try {
          const backendResult = await ocrApi.processImage(base64Image)
          setExtractedData({
            medicines: backendResult.medicines,
            doctorName: backendResult.doctorName,
            date: backendResult.date,
            diagnosis: backendResult.diagnosis,
            rawText: backendResult.rawText,
          })
          toast({
            title: "Prescription processed successfully",
            description: `Extracted ${backendResult.medicines.length} medicine(s)`,
          })
          return
        } catch (backendErr) {
          console.log("[ ] Backend OCR unavailable, falling back to on-device OCR:", backendErr)
        }

        const worker = await createWorker("eng", 1, {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setOcrProgress(Math.round(m.progress * 100))
            }
          },
        })

        console.log("[ ] Starting OCR recognition...")
        const {
          data: { text },
        } = await worker.recognize(file)
        console.log("[ ] OCR completed, extracted text length:", text.length)

        await worker.terminate()

        if (!text || text.trim().length < 10) {
          throw new Error("Could not extract meaningful text from image")
        }

        const medicines = parseMedicines(text)
        const doctorName = extractDoctorName(text)
        const diagnosis = extractDiagnosis(text)
        const date = extractDate(text)

        const extractedData: ExtractedData = {
          medicines,
          doctorName,
          date,
          diagnosis,
          rawText: text,
        }

        setExtractedData(extractedData)

        toast({
          title: "Prescription processed successfully",
          description: `Extracted ${medicines.length} medicine(s)`,
        })
      } catch (err) {
        console.error("[ ] OCR processing error:", err)
        setError("Failed to process prescription. Please try again with a clearer image.")
        toast({
          title: "Processing failed",
          description: err instanceof Error ? err.message : "Please ensure the image is clear and try again",
          variant: "destructive",
        })
      } finally {
        setIsProcessing(false)
        setOcrProgress(0)
      }
    },
    [toast],
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        })
        return
      }
      processImage(file)
    }
  }

  const handleSave = async () => {
    if (!extractedData) return

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      const token = typeof window !== 'undefined' ? localStorage.getItem('bisheshoggo_token') : null
      const response = await fetch(`${apiUrl}/medical-records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          record_type: "prescription",
          title: `Prescription - ${extractedData.date || new Date().toLocaleDateString()}`,
          description: extractedData.diagnosis || "Scanned prescription",
          prescriptions: extractedData.medicines,
          attachments: image ? [image] : [],
        }),
      })

      if (!response.ok) throw new Error("Failed to save")

      toast({
        title: "Prescription saved",
        description: "Added to your medical records",
      })

      setImage(null)
      setExtractedData(null)
    } catch (err) {
      console.error("[ ] Save prescription error:", err)
      toast({
        title: "Failed to save",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {!image && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Upload Prescription</CardTitle>
                <CardDescription>
                  Take a photo or upload an image of your prescription. Our AI will extract medicine details
                  automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Button
                      size="lg"
                      className="h-32 flex-col gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                    >
                      <Upload className="h-8 w-8" />
                      <span>Upload from Gallery</span>
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      className="h-32 flex-col gap-2 bg-transparent"
                      onClick={() => {
                        fileInputRef.current?.setAttribute("capture", "environment")
                        fileInputRef.current?.click()
                      }}
                      disabled={isProcessing}
                    >
                      <Camera className="h-8 w-8" />
                      <span>Take Photo</span>
                    </Button>
                  </div>

                  <div className="rounded-lg border border-dashed border-border/40 bg-accent/50 p-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">Tips for best results:</p>
                        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                          <li>Ensure good lighting and avoid shadows</li>
                          <li>Keep the prescription flat and in focus</li>
                          <li>Capture all text clearly without blur</li>
                          <li>Avoid glare or reflections</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Processing Prescription...</p>
                  <p className="text-sm text-muted-foreground">
                    {ocrProgress > 0 ? `Extracting text: ${ocrProgress}%` : "Initializing OCR engine..."}
                  </p>
                  {ocrProgress > 0 && (
                    <div className="mt-4 h-2 w-64 overflow-hidden rounded-full bg-accent">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${ocrProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {image && !isProcessing && extractedData && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Scanned Image</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative aspect-3/4 overflow-hidden rounded-lg border border-border/40">
                      <Image
                        src={image || "/placeholder.svg"}
                        alt="Scanned prescription"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Extracted Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {extractedData.doctorName && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Doctor</p>
                        <p className="text-base">{extractedData.doctorName}</p>
                      </div>
                    )}

                    {extractedData.date && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Date</p>
                        <p className="text-base">{extractedData.date}</p>
                      </div>
                    )}

                    {extractedData.diagnosis && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Diagnosis</p>
                        <p className="text-base">{extractedData.diagnosis}</p>
                      </div>
                    )}

                    <div>
                      <p className="mb-2 text-sm font-medium text-muted-foreground">
                        Medicines ({extractedData.medicines.length})
                      </p>
                      <div className="space-y-2">
                        {extractedData.medicines.map((med, index) => (
                          <div key={index} className="rounded-lg border border-border/40 bg-accent/50 p-3">
                            <p className="font-medium">{med.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {med.dosage} - {med.frequency}
                              {med.duration && ` for ${med.duration}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <MedicineSuggestions prescriptions={extractedData.medicines} diagnosis={extractedData.diagnosis} />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Raw Extracted Text</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-accent/50 p-4 text-sm">
                    {extractedData.rawText}
                  </pre>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button onClick={handleSave} size="lg" className="flex-1">
                  <FileText className="mr-2 h-5 w-5" />
                  Save to Medical Records
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setImage(null)
                    setExtractedData(null)
                  }}
                >
                  Scan Another
                </Button>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-destructive/50">
                <CardContent className="flex flex-col items-center py-12">
                  <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
                  <p className="mb-2 text-lg font-medium">Processing Failed</p>
                  <p className="mb-4 text-center text-sm text-muted-foreground">{error}</p>
                  <Button
                    onClick={() => {
                      setImage(null)
                      setError(null)
                    }}
                  >
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
