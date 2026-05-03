#!/bin/bash
# Mode production Flask — Sert le build React depuis Flask
echo "🔬 QualityVision A2A — Flask Production"
echo ""

export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-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}"

# Build React si nécessaire
if [ ! -d "frontend/dist" ]; then
  echo "📦 Build du frontend React..."
  cd frontend && npm install && npm run build && cd ..
fi

echo "🚀 Démarrage Flask sur :8000..."
python app.py
