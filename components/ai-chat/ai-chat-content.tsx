"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Send, Bot, User, TrendingUp, Activity, Heart, Brain } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { HealthVisualization } from "./health-visualization"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

/** Renders **bold**, inline text within a single line. */
function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

/**
 * Lightweight markdown renderer covering what the AI actually outputs
 * (### headings, **bold**, and "*"/"-" bullet lists) - avoids pulling in a
 * full markdown dependency for a handful of patterns.
 */
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n")
  const blocks: React.ReactNode[] = []
  let listItems: string[] = []

  const flushList = (key: string) => {
    if (listItems.length === 0) return
    blocks.push(
      <ul key={key} className="list-disc space-y-1 pl-5">
        {listItems.map((item, i) => (
          <li key={i}>
            <InlineText text={item} />
          </li>
        ))}
      </ul>,
    )
    listItems = []
  }

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim()
    const bulletMatch = line.match(/^[*-]\s+(.*)/)
    const headingMatch = line.match(/^(#{1,4})\s+(.*)/)

    if (bulletMatch) {
      listItems.push(bulletMatch[1])
      return
    }
    flushList(`list-${idx}`)

    if (/^(-{3,}|\*{3,})$/.test(line)) {
      blocks.push(<hr key={idx} className="my-2 border-border/60" />)
    } else if (headingMatch) {
      const level = headingMatch[1].length
      blocks.push(
        <p key={idx} className={level <= 2 ? "font-semibold text-base mt-1" : "font-semibold mt-1"}>
          <InlineText text={headingMatch[2]} />
        </p>,
      )
    } else if (line.length === 0) {
      blocks.push(<div key={idx} className="h-1" />)
    } else {
      blocks.push(
        <p key={idx} className="leading-relaxed">
          <InlineText text={line} />
        </p>,
      )
    }
  })
  flushList("list-end")

  return <div className="space-y-1.5 text-sm">{blocks}</div>
}

export function AIChatContent() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showVisualization, setShowVisualization] = useState(false)
  const [healthData, setHealthData] = useState<any>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (error) {
      console.error("[ ] AI Chat Error:", error)
    }
  }, [error])

  // Detect when to show visualizations based on message content
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === "assistant") {
      const content = lastMessage.content.toLowerCase()

      if (
        content.includes("data") ||
        content.includes("statistics") ||
        content.includes("trend") ||
        content.includes("analysis")
      ) {
        setShowVisualization(true)
        setHealthData({
          symptoms: [
            { name: "Fever", count: 12 },
            { name: "Headache", count: 8 },
            { name: "Cough", count: 15 },
            { name: "Fatigue", count: 10 },
            { name: "Body Pain", count: 7 },
          ],
          healthScore: 75,
          consultations: [
            { month: "Jan", count: 3 },
            { month: "Feb", count: 5 },
            { month: "Mar", count: 4 },
            { month: "Apr", count: 6 },
            { month: "May", count: 8 },
          ],
          vitals: {
            heartRate: 72,
            bloodPressure: "120/80",
            temperature: 98.6,
            weight: 65,
          },
        })
      }
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)

    try {
      // Use the FastAPI backend for AI chat
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/ai/chat/simple`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('bisheshoggo_token') || ''}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response from AI")
      }

      const data = await response.json()

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content || "I apologize, but I couldn't generate a response. Please try again.",
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      console.error("[ ] Chat error:", err)
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setIsLoading(false)
    }
  }

  const quickPrompts = [
    { icon: Heart, text: "Analyze my health trends", color: "text-red-500" },
    { icon: Activity, text: "What are common symptoms in my area?", color: "text-blue-500" },
    { icon: Brain, text: "Explain my recent diagnosis", color: "text-purple-500" },
    { icon: TrendingUp, text: "Show my health progress", color: "text-green-500" },
  ]

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-2xl space-y-6"
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-medical-blue/20 to-medical-teal/10 border border-white/10 shadow-elevated">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">AI Medical Assistant</h2>
              <p className="text-muted-foreground">
                Ask me anything about your health, symptoms, medications, or medical records. I can also analyze your
                health data and provide insights.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {quickPrompts.map((prompt, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => {
                    setInput(prompt.text)
                  }}
                  className="hover-lift flex items-center gap-3 rounded-lg border border-border/40 bg-card p-4 text-left"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <prompt.icon className={`h-4.5 w-4.5 ${prompt.color}`} />
                  </div>
                  <span className="text-sm">{prompt.text}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="mx-auto max-w-3xl space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  className={`p-4 border-0 ${
                    message.role === "user"
                      ? "ml-auto max-w-[80%] bg-linear-to-br from-primary to-medical-teal text-primary-foreground shadow-[0_4px_20px_-6px_oklch(0.68_0.19_238/50%)]"
                      : "mr-auto max-w-[95%] bg-card shadow-elevated"
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        message.role === "user" ? "bg-white/20" : "bg-primary/10"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <FormattedMessage content={message.content} />
                      {message.role === "assistant" &&
                        index === messages.length - 1 &&
                        showVisualization &&
                        healthData && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ delay: 0.5 }}
                          >
                            <HealthVisualization data={healthData} />
                          </motion.div>
                        )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mr-auto max-w-[95%]">
              <Card className="p-4">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 animate-pulse text-primary" />
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="border-destructive bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}. Please check your connection and try again.</p>
              </Card>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border/40 bg-background/95 p-4 backdrop-blur">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your health, symptoms, or request health data analysis..."
            className="min-h-[60px] resize-none shadow-elevated"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as any)
              }
            }}
          />
          <Button type="submit" size="icon" className="h-[60px] w-[60px] rounded-xl" disabled={isLoading || !input.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  )
}
