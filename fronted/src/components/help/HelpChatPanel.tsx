"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Send, Bot, User, Sparkles, BookOpen, BadgeCheck, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, ImageIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useHelpAssistant } from "@/context/help-assistant-context"
import type { ChatMessage, HelpStep } from "@/data/help/types"
import { LocationIndicator, LocationIndicatorCompact } from "./location-indicator"

function StepsGuide({ steps }: { steps: HelpStep[] }) {
  const [expanded, setExpanded] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
      >
        <ImageIcon className="h-3 w-3" />
        <span>Ver guia paso a paso ({steps.length} pasos)</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-600 dark:bg-slate-700"
            >
              <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {idx + 1}
                </span>
                {step.text}
              </p>
              {step.image && (
                <button
                  onClick={() => setSelectedImage(selectedImage === step.image ? null : step.image!)}
                  className="mt-1.5 w-full overflow-hidden rounded border border-slate-200 dark:border-slate-600"
                >
                  <Image
                    src={step.image}
                    alt={`Paso ${idx + 1}: ${step.text}`}
                    width={300}
                    height={180}
                    className="h-auto w-full object-cover"
                  />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen image overlay */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <Image
            src={selectedImage}
            alt="Vista ampliada"
            width={800}
            height={600}
            className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}

function SourceBadge({ source }: { source: ChatMessage["source"] }) {
  if (!source) return null
  if (source === "ai") {
    return (
      <div className="mt-1.5 flex items-center gap-1 text-[10px] opacity-60">
        <Sparkles className="h-3 w-3" />
        <span>Respuesta generada por IA</span>
      </div>
    )
  }
  if (source === "promoted") {
    return (
      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 opacity-70">
        <BadgeCheck className="h-3 w-3" />
        <span>Respuesta verificada</span>
      </div>
    )
  }
  return (
    <div className="mt-1.5 flex items-center gap-1 text-[10px] opacity-60">
      <BookOpen className="h-3 w-3" />
      <span>Base de conocimiento</span>
    </div>
  )
}

function FeedbackButtons({ msg }: { msg: ChatMessage }) {
  const { sendFeedback } = useHelpAssistant()

  if (msg.role !== "assistant") return null

  const hasFeedback = msg.feedback != null

  return (
    <div className="mt-1 flex items-center gap-1">
      <button
        onClick={() => void sendFeedback(msg.id, "POSITIVE")}
        disabled={hasFeedback}
        className={`rounded p-0.5 transition-colors ${
          msg.feedback === "POSITIVE"
            ? "text-emerald-600 dark:text-emerald-400"
            : hasFeedback
              ? "text-slate-300 dark:text-slate-600"
              : "text-slate-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400"
        }`}
        aria-label="Util"
      >
        <ThumbsUp className="h-3 w-3" />
      </button>
      <button
        onClick={() => void sendFeedback(msg.id, "NEGATIVE")}
        disabled={hasFeedback}
        className={`rounded p-0.5 transition-colors ${
          msg.feedback === "NEGATIVE"
            ? "text-red-500 dark:text-red-400"
            : hasFeedback
              ? "text-slate-300 dark:text-slate-600"
              : "text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
        }`}
        aria-label="No util"
      >
        <ThumbsDown className="h-3 w-3" />
      </button>
    </div>
  )
}

export function HelpChatPanel() {
  const {
    isOpen,
    sectionMeta,
    routeContext, // DETECCIÓN AUTOMÁTICA: Contexto de ubicación
    messages,
    mascotState,
    sendMessage,
  } = useHelpAssistant()

  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages or thinking state
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, mascotState])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || mascotState === "thinking") return
    setInput("")
    await sendMessage(text)
  }, [input, mascotState, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleChipClick = (question: string) => {
    void sendMessage(question)
  }

  const handleSuggestionClick = (suggestion: string) => {
    void sendMessage(suggestion)
  }

  const quickEntries = sectionMeta?.quickActions
    .map((id) => sectionMeta.entries.find((e) => e.id === id))
    .filter(Boolean)

  return (
    <div
      className={`fixed bottom-24 right-6 z-50 flex h-[480px] w-[360px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 dark:border-slate-700 dark:bg-slate-900 max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:h-[70vh] max-md:w-full max-md:rounded-b-none ${
        isOpen
          ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-4 scale-95 opacity-0"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <Bot className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Asistente
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {sectionMeta?.label ?? "General"}
        </Badge>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 px-4 py-3">
        {/* Welcome message if no history */}
        {messages.length === 0 && sectionMeta && (
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <p>{sectionMeta.welcomeMessage}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Preguntame lo que necesites o elige una opcion rapida:
              </p>
            </div>

            {/* DETECCIÓN AUTOMÁTICA: Mostrar ubicación actual */}
            <LocationIndicator
              section={routeContext.section}
              action={routeContext.action}
              onSuggestionClick={handleSuggestionClick}
            />

            {/* Quick action chips */}
            {quickEntries && quickEntries.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {quickEntries.map(
                  (entry) =>
                    entry && (
                      <button
                        key={entry.id}
                        onClick={() => handleChipClick(entry.question)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-700 transition-colors hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary"
                      >
                        {entry.question}
                      </button>
                    ),
                )}
              </div>
            )}
          </div>
        )}

        {/* Chat messages */}
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.steps && msg.steps.length > 0 && (
                  <StepsGuide steps={msg.steps} />
                )}
                <SourceBadge source={msg.source} />
                <FeedbackButtons msg={msg} />
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {mascotState === "thinking" && (
            <div className="flex gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <Separator />

      {/* Input area */}
      <div className="flex items-end gap-2 px-3 py-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu pregunta..."
          rows={1}
          className="max-h-20 min-h-[36px] flex-1 resize-none rounded-md border border-slate-200 bg-transparent px-3 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-primary dark:border-slate-700"
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={!input.trim() || mascotState === "thinking"}
          onClick={() => void handleSend()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
