// Per-task visual identity — gradients, halo color, accent for HUD & buttons.
// Colors are picked to match each upstream's original site signature.

export const TASK_THEMES = {
  task1: {
    // SBT Vision — clinical deep blues + crisp white
    name: 'SBT Vision',
    icon: 'Cpu',
    headerFrom: 'from-blue-700',
    headerVia:  'via-blue-600',
    headerTo:   'to-sky-500',
    glowClass:  'shadow-glow-task1',
    accentBg:   'bg-blue-600',
    accentText: 'text-blue-600',
    accentRing: 'ring-blue-500/40',
    grain:      'rgba(37, 99, 235, 0.06)',
    rgb:        '37, 99, 235',
  },
  task2: {
    // QualityVision — scientific cyan / teal
    name: 'QualityVision A2A',
    icon: 'ScanSearch',
    headerFrom: 'from-cyan-600',
    headerVia:  'via-teal-500',
    headerTo:   'to-emerald-500',
    glowClass:  'shadow-glow-task2',
    accentBg:   'bg-cyan-600',
    accentText: 'text-cyan-600',
    accentRing: 'ring-cyan-500/40',
    grain:      'rgba(8, 145, 178, 0.06)',
    rgb:        '8, 145, 178',
  },
  task3: {
    // SBT Intelligence — navy + gold (matches its dashboard)
    name: 'SBT Intelligence',
    icon: 'Network',
    headerFrom: 'from-[#1e3a5f]',
    headerVia:  'via-[#2c4a6e]',
    headerTo:   'to-amber-600',
    glowClass:  'shadow-glow-task3',
    accentBg:   'bg-[#1e3a5f]',
    accentText: 'text-amber-600',
    accentRing: 'ring-amber-500/40',
    grain:      'rgba(202, 138, 4, 0.05)',
    rgb:        '30, 58, 95',
  },
}

export const themeOf = (id) => TASK_THEMES[id] || TASK_THEMES.task1
