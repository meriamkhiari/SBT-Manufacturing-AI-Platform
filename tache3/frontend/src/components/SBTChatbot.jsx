import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Send, Bot, User, Loader2, MessageCircle,
  Phone, Mail, ExternalLink, RotateCcw, Copy, Check,
  ChevronDown, Minimize2,
} from 'lucide-react'
import axios from 'axios'

// ── Données statiques ─────────────────────────────────────────────────────────

const SUGGESTED = [
  { icon: '🏭', text: 'What are your manufacturing services?' },
  { icon: '📍', text: 'Where is SBT located?' },
  { icon: '📞', text: 'How can I contact SBT?' },
  { icon: '⚙️',  text: 'What equipment do you use?' },
  { icon: '🤝', text: 'How to become a partner?' },
  { icon: '📦', text: 'What products do you manufacture?' },
]

const WELCOME = {
  role: 'assistant',
  id: 'welcome',
  content: `Hello! I'm the **SBT virtual assistant** for **Smart Brain Technologie**.

I can answer all your questions about our:
- **Manufacturing services** (cutting, crimping, welding, assembly)
- **Equipment & machinery** (KOMAX, SCHLEUNIGER, SCHUNK)
- **Products** (wiring harnesses, electrical cabinets)
- **Location & contact** information
- **Partnership** opportunities

Feel free to ask in **any language** — I'll respond in yours. How can I help you?`,
}

// ── Markdown renderer léger ───────────────────────────────────────────────────

function renderMarkdown(text) {
  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Titre ## ou ###
    if (/^#{2,3}\s/.test(line)) {
      const content = line.replace(/^#{2,3}\s+/, '')
      elements.push(
        <p key={i} className="font-bold text-slate-900 dark:text-slate-100 mt-2 mb-0.5 text-sm">
          {inlineMarkdown(content)}
        </p>
      )
      i++; continue
    }

    // Liste à puces (- ou *)
    if (/^[\-\*]\s/.test(line)) {
      const items = []
      while (i < lines.length && /^[\-\*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\-\*]\s+/, ''))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-0.5 my-1 ml-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-1.5 text-sm">
              <span className="text-primary-500 mt-0.5 shrink-0">•</span>
              <span>{inlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Liste numérotée
    if (/^\d+\.\s/.test(line)) {
      const items = []
      const startNum = parseInt(line)
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-0.5 my-1 ml-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-1.5 text-sm">
              <span className="text-primary-500 font-semibold shrink-0 min-w-[16px]">{startNum + j}.</span>
              <span>{inlineMarkdown(item)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Ligne vide
    if (line.trim() === '') {
      i++; continue
    }

    // Paragraphe normal
    elements.push(
      <p key={i} className="text-sm leading-relaxed">
        {inlineMarkdown(line)}
      </p>
    )
    i++
  }

  return elements
}

function inlineMarkdown(text) {
  // **bold**, *italic*, `code`, liens simples
  const parts = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|https?:\/\/\S+)/g
  let last = 0
  let m

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const token = m[0]
    if (token.startsWith('**'))
      parts.push(<strong key={m.index} className="font-semibold">{token.slice(2, -2)}</strong>)
    else if (token.startsWith('*'))
      parts.push(<em key={m.index}>{token.slice(1, -1)}</em>)
    else if (token.startsWith('`'))
      parts.push(<code key={m.index} className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-[11px] font-mono">{token.slice(1, -1)}</code>)
    else
      parts.push(<a key={m.index} href={token} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 underline underline-offset-2 hover:text-primary-800 text-[11px]">{token}</a>)
    last = m.index + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length > 0 ? parts : text
}

// ── Composant bulle de message ────────────────────────────────────────────────

function MessageBubble({ msg, isLast }) {
  const isUser  = msg.role === 'user'
  const [copied, setCopied] = useState(false)

  const copyText = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex gap-2 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${
        isUser
          ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white'
          : 'bg-gradient-to-br from-blue-500 to-indigo-700 text-white'
      }`}>
        {isUser ? <User size={12} /> : <Bot size={12} />}
      </div>

      {/* Bubble + actions */}
      <div className={`max-w-[82%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-3.5 py-2.5 rounded-2xl relative ${
          isUser
            ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-tr-sm shadow-md shadow-primary-500/20'
            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-sm shadow-sm'
        }`}>
          {isUser
            ? <p className="text-sm leading-relaxed">{msg.content}</p>
            : <div className="space-y-1">{renderMarkdown(msg.content)}</div>
          }
        </div>

        {/* Timestamp + copy */}
        <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{msg.time}</span>
          {!isUser && (
            <button
              onClick={copyText}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              title="Copier"
            >
              {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex gap-2"
    >
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shrink-0 shadow-sm">
        <Bot size={12} className="text-white" />
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          {[0, 150, 300].map((delay, i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: delay / 1000 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

let msgCounter = 0
const newId = () => `msg_${++msgCounter}`

export default function SBTChatbot() {
  const [isOpen,     setIsOpen]     = useState(false)
  const [minimized,  setMinimized]  = useState(false)
  const [messages,   setMessages]   = useState([{ ...WELCOME, id: newId() }])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [hasNew,     setHasNew]     = useState(false)
  const [newCount,   setNewCount]   = useState(0)
  const [charCount,  setCharCount]  = useState(0)

  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  const MAX_CHARS = 500

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && !minimized) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [messages, isOpen, minimized, loading])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !minimized) {
      setHasNew(false)
      setNewCount(0)
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, minimized])

  // Construit l'historique à envoyer au backend (sans le message welcome)
  const buildHistory = useCallback(() => {
    return messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }))
  }, [messages])

  const sendMessage = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || loading || msg.length > MAX_CHARS) return

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg = { role: 'user', content: msg, time, id: newId() }

    setInput('')
    setCharCount(0)
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    // Historique SANS le message qu'on vient d'ajouter (le backend le reçoit via "message")
    const history = buildHistory()

    try {
      const { data } = await axios.post('/api/chat', {
        message: msg,
        history,
      }, { timeout: 30_000 })

      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const botMsg = { role: 'assistant', content: data.reply, time: replyTime, id: newId() }
      setMessages(prev => [...prev, botMsg])

      if (!isOpen || minimized) {
        setHasNew(true)
        setNewCount(n => n + 1)
      }
    } catch (err) {
      const errTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setMessages(prev => [...prev, {
        role: 'assistant',
        id: newId(),
        time: errTime,
        content: err.code === 'ECONNABORTED'
          ? 'The response took too long. Please try again.\n\nDirect contact: **contact@smartbtechnologie.com** | **+216 71 601 295**'
          : 'An error occurred. Please contact us directly:\n- **Email**: contact@smartbtechnologie.com\n- **Phone**: +216 71 601 295\n- **Mobile**: +216 98 702 325',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    setCharCount(e.target.value.length)
  }

  const resetConversation = () => {
    setMessages([{ ...WELCOME, id: 'welcome' }])
    setInput('')
    setCharCount(0)
  }

  const showSuggestions = messages.length <= 1 && !loading

  return (
    <>
      {/* ── Bouton flottant ── */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[100]">
        {/* Badge nouveau message */}
        <AnimatePresence>
          {(!isOpen || minimized) && hasNew && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold z-10 px-1 shadow-md"
            >
              {newCount > 9 ? '9+' : newCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Tooltip label */}
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.5, duration: 0.3 }}
            className="absolute right-16 top-1/2 -translate-y-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg pointer-events-none"
          >
            Besoin d'aide ? 💬
            <span className="absolute right-[-6px] top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900 dark:border-l-white" />
          </motion.div>
        )}

        <motion.button
          onClick={() => {
            if (isOpen && minimized) { setMinimized(false); return }
            setIsOpen(v => !v)
            setMinimized(false)
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl shadow-blue-500/50 flex items-center justify-center relative"
          title="Assistant SBT"
        >
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-25" />
          )}
          <AnimatePresence mode="wait">
            {isOpen && !minimized
              ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X size={22} />
                </motion.div>
              : <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <MessageCircle size={22} />
                </motion.div>
            }
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── Overlay sombre derrière le panel (mobile uniquement) ── */}
      <AnimatePresence>
        {isOpen && !minimized && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sm:hidden fixed inset-0 bg-black/40 z-[98]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Panel chatbot ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed bottom-0 left-0 right-0 sm:bottom-24 sm:right-6 sm:left-auto sm:w-[390px] z-[99] flex flex-col rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border-t border-slate-200 dark:border-slate-700 sm:border bg-white dark:bg-slate-900"
            style={{ maxHeight: minimized ? 'auto' : 'min(92dvh, 640px)', height: minimized ? 'auto' : 'min(92dvh, 640px)' }}
          >
            {/* Drag handle (mobile) */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 px-4 py-3 flex items-center gap-3 shrink-0">
              {/* Avatar animé */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot size={20} className="text-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-blue-700 rounded-full animate-pulse" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">Assistant SBT</p>
                <p className="text-blue-200 text-[11px]">Smart Brain Technologie · En ligne</p>
              </div>

              {/* Actions header */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={resetConversation}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                  title="Nouvelle conversation"
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  onClick={() => setMinimized(v => !v)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                  title={minimized ? 'Agrandir' : 'Réduire'}
                >
                  {minimized
                    ? <ChevronDown size={13} className="rotate-180" />
                    : <Minimize2 size={13} />
                  }
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                  title="Fermer"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* ── Contact rapide ── */}
            {!minimized && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-blue-100 dark:border-blue-900/40 px-3 py-1.5 flex items-center gap-3 shrink-0 flex-wrap">
                <a href="tel:+21671601295" className="flex items-center gap-1.5 text-[11px] text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 font-medium transition-colors">
                  <Phone size={10} className="shrink-0" /> +216 71 601 295
                </a>
                <span className="text-slate-300 dark:text-slate-600 text-xs">|</span>
                <a href="mailto:contact@smartbtechnologie.com" className="flex items-center gap-1.5 text-[11px] text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 font-medium transition-colors truncate">
                  <Mail size={10} className="shrink-0" /> contact@smartbtechnologie.com
                </a>
              </div>
            )}

            {/* ── Corps (messages) ── */}
            <AnimatePresence>
              {!minimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col flex-1 min-h-0 overflow-hidden"
                >
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50 dark:bg-slate-900/50 min-h-[200px]">
                    {messages.map((msg, idx) => (
                      <MessageBubble key={msg.id} msg={msg} isLast={idx === messages.length - 1} />
                    ))}

                    <AnimatePresence>
                      {loading && <TypingIndicator />}
                    </AnimatePresence>

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Suggestions */}
                  <AnimatePresence>
                    {showSuggestions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0 overflow-hidden"
                      >
                        <p className="text-[10px] text-slate-400 uppercase font-semibold mb-2 tracking-wider">Questions rapides</p>
                        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                          {SUGGESTED.map((s, i) => (
                            <motion.button
                              key={i}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              onClick={() => sendMessage(s.text)}
                              disabled={loading}
                              className="shrink-0 flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:border-blue-300 hover:text-blue-700 active:scale-95 transition-all font-medium whitespace-nowrap"
                            >
                              <span>{s.icon}</span>
                              <span>{s.text.split(' ').slice(0, 3).join(' ')}…</span>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Zone de saisie ── */}
                  <div className="px-3 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shrink-0">
                    <div className="flex items-end gap-2">
                      <div className="flex-1 relative">
                        <textarea
                          ref={inputRef}
                          value={input}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Posez votre question..."
                          disabled={loading}
                          rows={1}
                          maxLength={MAX_CHARS}
                          className="w-full text-sm bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-60 resize-none max-h-28 overflow-y-auto leading-relaxed"
                          style={{ minHeight: '46px' }}
                          onInput={(e) => {
                            e.target.style.height = 'auto'
                            e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px'
                          }}
                        />
                        {charCount > MAX_CHARS * 0.8 && (
                          <span className={`absolute bottom-2 right-3 text-[9px] font-mono ${charCount >= MAX_CHARS ? 'text-red-500' : 'text-slate-400'}`}>
                            {charCount}/{MAX_CHARS}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || loading || charCount > MAX_CHARS}
                        className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all shrink-0 shadow-lg shadow-blue-500/30"
                      >
                        {loading
                          ? <Loader2 size={17} className="animate-spin" />
                          : <Send size={17} />
                        }
                      </button>
                    </div>
                    <p className="hidden sm:block text-[9px] text-slate-400 mt-1.5 text-center">
                      <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px]">Enter</kbd> envoyer · <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px]">Shift+Enter</kbd> saut de ligne
                    </p>
                  </div>

                  {/* ── Footer ── */}
                  <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-3 py-1.5 flex items-center justify-between shrink-0">
                    <span className="text-[9px] text-slate-400 flex items-center gap-1">
                      Powered by <strong className="text-slate-500">Claude AI</strong>
                    </span>
                    <a
                      href="https://www.smartbtechnologie.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-0.5 transition-colors"
                    >
                      smartbtechnologie.com <ExternalLink size={8} />
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
