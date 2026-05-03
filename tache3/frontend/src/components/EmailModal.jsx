import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Mail, Download, RefreshCw, Sparkles, Linkedin, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const LANG_OPTIONS = [
  { code: 'fr', label: '🇫🇷 Français'    },
  { code: 'en', label: '🇬🇧 English'     },
  { code: 'de', label: '🇩🇪 Deutsch'     },
  { code: 'it', label: '🇮🇹 Italiano'    },
  { code: 'es', label: '🇪🇸 Español'     },
  { code: 'ar', label: '🇹🇳 العربية'    },
  { code: 'pt', label: '🇵🇹 Português'  },
  { code: 'nl', label: '🇳🇱 Nederlands' },
]

export default function EmailModal({ company, onClose }) {
  const [lang,      setLang]      = useState('fr')
  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [generated, setGenerated] = useState(false)
  const [copied,    setCopied]    = useState(false)

  /* ── Generate email via AI ───────────────────────────────────────── */
  const generateEmail = async (selectedLang) => {
    if (!company) return
    setLoading(true)
    setGenerated(false)
    setEmail('')
    try {
      const res  = await fetch('/api/generate-email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ company, lang: selectedLang }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEmail(data.email || '')
      setGenerated(true)
    } catch (err) {
      toast.error(`Erreur : ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  /* Auto-generate when modal opens (hook must be before any early return) */
  useEffect(() => { generateEmail('fr') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!company) return null

  /* ── Language change → auto-regenerate ──────────────────────────── */
  const handleLangChange = (newLang) => {
    setLang(newLang)
    generateEmail(newLang)
  }

  /* ── Helpers ─────────────────────────────────────────────────────── */
  const copyToClipboard = () => {
    navigator.clipboard.writeText(email)
    setCopied(true)
    toast.success('Email copié !')
    setTimeout(() => setCopied(false), 2500)
  }

  const downloadTxt = () => {
    const blob = new Blob([email], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `email_${company.name?.replace(/\s+/g, '_') || 'prospect'}_${lang}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Email téléchargé')
  }

  /* Extract subject + body from generated text */
  const extractParts = (text) => {
    const subjectMatch = text.match(/(?:Objet|Subject|Asunto|Betreff|Oggetto|Onderwerp|Assunto)\s*[:\*]+\s*(.+)/i)
    const subject      = subjectMatch ? subjectMatch[1].replace(/\*+/g, '').trim() : 'Partenariat SBT — Smart Brain Technologie'
    const body         = text.replace(/(?:Objet|Subject|Asunto|Betreff|Oggetto|Onderwerp|Assunto)\s*[:\*]+\s*.+\n?/i, '').trim()
    return { subject, body }
  }

  /*
   * Gmail compose URL — computed as <a href> so the browser NEVER blocks it.
   * Body is truncated to 1800 chars before encoding to avoid URL-length limits.
   */
  const gmailHref = useMemo(() => {
    if (!generated || !email) return '#'
    const { subject, body } = extractParts(email)
    const truncatedBody = body.length > 1800 ? body.slice(0, 1800) + '\n…(voir fichier téléchargé)' : body
    const to  = company.email ? `&to=${encodeURIComponent(company.email)}` : ''
    return `https://mail.google.com/mail/?view=cm&fs=1${to}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(truncatedBody)}`
  }, [generated, email, company.email])

  /* mailto: fallback for devices where Gmail URL doesn't work */
  const mailtoHref = useMemo(() => {
    if (!generated || !email || !company.email) return '#'
    const { subject, body } = extractParts(email)
    const truncatedBody = body.length > 1800 ? body.slice(0, 1800) + '\n…' : body
    return `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(truncatedBody)}`
  }, [generated, email, company.email])

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-900 to-primary-700 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base">Générateur d'Email IA</h2>
                <p className="text-white/60 text-xs">{company.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Controls */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Langue de l'email
                </label>
                {/* onChange relance la génération automatiquement */}
                <select
                  value={lang}
                  onChange={e => handleLangChange(e.target.value)}
                  disabled={loading}
                  className="select text-sm w-full disabled:opacity-60"
                >
                  {LANG_OPTIONS.map(o => (
                    <option key={o.code} value={o.code}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => generateEmail(lang)}
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Génération…
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      {generated ? 'Régénérer' : 'Générer'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Email content */}
          <div className="flex-1 overflow-y-auto p-6 min-h-[200px]">
            {!generated && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                  <Mail size={28} className="text-primary-400" />
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Préparation de l'email…
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">
                  Email personnalisé pour <strong>{company.name}</strong> en cours de génération.
                </p>
              </div>
            )}

            {loading && (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-full border-4 border-primary-100 dark:border-primary-900/50" />
                  <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Génération en cours…
                </p>
                <p className="text-sm text-slate-400">
                  Claude rédige votre email en {LANG_OPTIONS.find(o => o.code === lang)?.label ?? lang}
                </p>
              </div>
            )}

            {generated && email && (
              <div className="space-y-3">
                <textarea
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-72 text-sm font-mono leading-relaxed p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  spellCheck={false}
                />
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                  ✏️ Modifiez le texte directement si besoin — rien ne sera envoyé automatiquement
                </p>
              </div>
            )}
          </div>

          {/* Footer actions */}
          {generated && email && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2 shrink-0 bg-white dark:bg-slate-900">

              {/* Actions secondaires */}
              <button
                onClick={copyToClipboard}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
              <button
                onClick={downloadTxt}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Download size={13} /> Télécharger
              </button>

              {/* Actions d'envoi — liens <a> natifs = jamais bloqués */}
              <div className="flex gap-2 ml-auto flex-wrap">

                {/* Gmail web — pré-rempli, non envoyé */}
                <a
                  href={gmailHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => toast('Gmail ouvert — vérifiez et envoyez manuellement', { icon: '📧' })}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95 no-underline"
                >
                  <Mail size={13} />
                  <span>Ouvrir Gmail</span>
                  <ExternalLink size={11} className="opacity-70" />
                </a>

                {/* Messagerie par défaut (mailto) — utile sur mobile */}
                {company.email && (
                  <a
                    href={mailtoHref}
                    onClick={() => toast('Email ouvert dans votre messagerie', { icon: '✉️' })}
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-slate-600 hover:bg-slate-700 text-white transition-all active:scale-95 no-underline"
                  >
                    <Mail size={13} />
                    <span>Messagerie</span>
                  </a>
                )}

                {/* LinkedIn */}
                {company.linkedin && (
                  <a
                    href={company.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-[#0077B5] hover:bg-[#006396] text-white transition-all active:scale-95 no-underline"
                    title="Ouvre le profil LinkedIn pour envoyer un message manuel"
                  >
                    <Linkedin size={13} />
                    <span>LinkedIn</span>
                    <ExternalLink size={11} className="opacity-70" />
                  </a>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
