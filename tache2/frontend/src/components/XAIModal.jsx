import { motion, AnimatePresence } from 'framer-motion'
import { X, Brain, TrendingUp, AlertTriangle, Lightbulb, Eye, Zap, Target, Info,
         MapPin, Scale, Layers, Ruler, Download, GitCompare } from 'lucide-react'
import clsx from 'clsx'
import ScoreBar from './ScoreBar'

const SEVERITY_CONFIG = {
  high: {
    label: 'Critique',
    icon: AlertTriangle,
    color: 'rose',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    border: 'border-rose-200 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300'
  },
  medium: {
    label: 'Moyen',
    icon: AlertTriangle,
    color: 'amber',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300'
  },
  low: {
    label: 'Mineur',
    icon: Info,
    color: 'emerald',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300'
  }
}

export default function XAIModal({ detection, index, isOpen, onClose }) {
  if (!isOpen || !detection) return null

  const xai = detection.xai || {}
  const sevConfig = SEVERITY_CONFIG[detection.severity] || SEVERITY_CONFIG.low
  const SevIcon = sevConfig.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className={clsx('px-6 py-4 border-b border-ink-200 dark:border-ink-800', sevConfig.bg)}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', sevConfig.bg, sevConfig.border, 'border')}>
                    <span className={clsx('font-mono font-bold text-sm', sevConfig.text)}>
                      {index + 1}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-ink-900 dark:text-white capitalize">
                    {(detection.class_name || 'Détection').replace(/_/g, ' ')}
                  </h2>
                  <span className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border', sevConfig.bg, sevConfig.border, sevConfig.text)}>
                    <SevIcon size={12} /> {sevConfig.label}
                  </span>
                </div>
                {detection.location_description && (
                  <p className="text-sm text-ink-600 dark:text-ink-300">
                    📍 {detection.location_description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-400 hover:text-ink-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Confidence Score */}
            <Section icon={Target} title="Score de confiance" color="primary">
              <ScoreBar 
                value={detection.confidence || 0} 
                severity={detection.severity} 
                label="Confiance du modèle"
                showPercentage
              />
              <div className="mt-3 text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
                Ce score indique la certitude du modèle d'IA concernant cette détection. 
                Un score élevé (&gt;80%) signifie une forte confiance, tandis qu'un score faible (&lt;60%) 
                suggère une vérification manuelle.
              </div>
            </Section>

            {/* Feature Importance */}
            {xai.feature_importance && Object.keys(xai.feature_importance).length > 0 && (
              <Section icon={TrendingUp} title="Importance des caractéristiques" color="violet">
                <div className="space-y-3">
                  {Object.entries(xai.feature_importance)
                    .sort((a, b) => b[1] - a[1])
                    .map(([feature, score]) => (
                      <div key={feature}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-medium text-ink-700 dark:text-ink-200 capitalize">
                            {feature.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
                            {(score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-ink-200 dark:bg-ink-800 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${score * 100}%` }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                  <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                    💡 <strong>Explication :</strong> Ces caractéristiques visuelles ont le plus contribué 
                    à la décision du modèle. Plus le score est élevé, plus la caractéristique est déterminante.
                  </p>
                </div>
              </Section>
            )}

            {/* Visual Evidence */}
            {xai.visual_evidence && (
              <Section icon={Eye} title="Indices visuels détectés" color="primary">
                <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                  <p className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed">
                    {xai.visual_evidence}
                  </p>
                </div>
                <div className="mt-3 text-xs text-ink-500 dark:text-ink-400">
                  Ces éléments visuels ont été identifiés par le modèle comme indicateurs du défaut.
                </div>
              </Section>
            )}

            {/* Narrative Explanation */}
            {xai.narrative_explanation && (
              <Section icon={Lightbulb} title="Explication détaillée" color="emerald">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed">
                    {xai.narrative_explanation}
                  </p>
                </div>
              </Section>
            )}

            {/* Counterfactual */}
            {xai.counterfactual && (
              <Section icon={Zap} title="Analyse contrefactuelle" color="amber">
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed mb-3">
                    <strong>↩ Scénario alternatif :</strong> {xai.counterfactual}
                  </p>
                  <div className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    💡 Cette analyse montre ce qui aurait dû être différent pour que le défaut ne soit pas détecté. 
                    Cela aide à comprendre les limites de décision du modèle.
                  </div>
                </div>
              </Section>
            )}

            {/* Contributing Features */}
            {xai.contributing_features && xai.contributing_features.length > 0 && (
              <Section icon={Brain} title="Caractéristiques contributives" color="violet">
                <div className="flex flex-wrap gap-2">
                  {xai.contributing_features.map((feature, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 
                               text-violet-700 dark:text-violet-300 text-xs font-medium
                               border border-violet-200 dark:border-violet-800"
                    >
                      {feature}
                    </motion.span>
                  ))}
                </div>
                <div className="mt-3 text-xs text-ink-500 dark:text-ink-400">
                  Ces caractéristiques ont contribué positivement à la détection.
                </div>
              </Section>
            )}

            {/* Confidence Tier */}
            {xai.confidence_tier && (
              <Section icon={Target} title="Niveau de fiabilité" color="primary">
                <div className={clsx(
                  'p-4 rounded-xl border',
                  xai.confidence_tier === 'high' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
                  xai.confidence_tier === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                  'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={clsx(
                      'px-3 py-1 rounded-lg text-sm font-bold uppercase',
                      xai.confidence_tier === 'high' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
                      xai.confidence_tier === 'medium' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                      'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                    )}>
                      {xai.confidence_tier}
                    </span>
                  </div>
                  <p className="text-sm text-ink-700 dark:text-ink-200">
                    {xai.confidence_tier === 'high' && '✅ Haute fiabilité - La détection est très probable.'}
                    {xai.confidence_tier === 'medium' && '⚠️ Fiabilité moyenne - Vérification recommandée.'}
                    {xai.confidence_tier === 'low' && '❌ Faible fiabilité - Vérification manuelle nécessaire.'}
                  </p>
                </div>
              </Section>
            )}

            {/* Confidence reason */}
            {xai.confidence_reason && (
              <Section icon={Target} title="Pourquoi cette confiance" color="primary">
                <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                  <p className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed">
                    {xai.confidence_reason}
                  </p>
                </div>
              </Section>
            )}

            {/* Severity justification */}
            {xai.severity_justification && (
              <Section icon={Scale} title="Justification de la sévérité" color="amber">
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                    {xai.severity_justification}
                  </p>
                  <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    Sévérité dérivée des règles métier QC + impact fonctionnel observé.
                  </div>
                </div>
              </Section>
            )}

            {/* Spatial context */}
            {xai.spatial_context && (
              <Section icon={MapPin} title="Contexte spatial" color="primary">
                <div className="p-4 rounded-xl bg-ink-50 dark:bg-ink-800/50 border border-ink-200 dark:border-ink-700">
                  <p className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed">
                    {xai.spatial_context}
                  </p>
                </div>
              </Section>
            )}

            {/* Comparison to normal */}
            {xai.comparison_to_normal && (
              <Section icon={GitCompare} title="Comparaison avec l'état normal" color="emerald">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed">
                    {xai.comparison_to_normal}
                  </p>
                  <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                    💡 La comparaison avec l'état attendu révèle l'écart concret qui justifie la détection.
                  </div>
                </div>
              </Section>
            )}

            {/* Measurement confidence */}
            {xai.measurement_confidence && (
              <Section icon={Ruler} title="Fiabilité des mesures" color="violet">
                <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                  <p className="text-sm text-violet-800 dark:text-violet-200 leading-relaxed">
                    {xai.measurement_confidence}
                  </p>
                </div>
              </Section>
            )}

            {/* SHAP Score */}
            {xai.shap_score != null && (
              <Section icon={Brain} title="Score SHAP" color="violet">
                <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-ink-700 dark:text-ink-200">
                      Valeur SHAP
                    </span>
                    <span className="text-lg font-mono font-bold text-violet-600 dark:text-violet-400">
                      {xai.shap_score.toFixed(4)}
                    </span>
                  </div>
                  <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                    Le score SHAP (SHapley Additive exPlanations) mesure la contribution de chaque 
                    caractéristique à la prédiction finale. Un score positif indique une contribution 
                    vers la détection du défaut.
                  </p>
                </div>
              </Section>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/50">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-xs text-ink-500 dark:text-ink-400">
                <Brain size={14} className="inline mr-1" />
                Explications générées par Claude Vision + XAI v2.0 — méthode {xai.method || 'Feature Importance + SHAP + Counterfactual'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify({ index, ...detection }, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `xai_detection_${index + 1}_${detection.class_name || 'unknown'}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ink-100 dark:bg-ink-800
                             hover:bg-ink-200 dark:hover:bg-ink-700 text-ink-700 dark:text-ink-200 text-xs font-medium transition-colors"
                >
                  <Download size={13} /> Export JSON
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700
                           text-white font-medium text-sm transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function Section({ icon: Icon, title, color, children }) {
  const colorClasses = {
    primary: 'text-primary-600 dark:text-primary-400',
    violet: 'text-violet-600 dark:text-violet-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400'
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className={colorClasses[color]} />
        <h3 className="text-sm font-bold text-ink-900 dark:text-white uppercase tracking-wide">
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}
