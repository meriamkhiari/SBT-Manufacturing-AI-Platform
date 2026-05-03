#!/bin/bash
# Mode développement Flask — Flask :8000 + React dev :3000
echo "🔬 QualityVision A2A — Mode Développement Flask"
echo ""

export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-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}"

# Install React deps si node_modules absent
if [ ! -d "frontend/node_modules" ]; then
  echo "📦 Installation des dépendances React..."
  cd frontend && npm install && cd ..
fi

# Start Flask
echo "🐍 Démarrage Flask sur :8000..."
python app.py &
FLASK_PID=$!

# Start React dev server
echo "⚛️  Démarrage React sur :3000..."
cd frontend && npm run dev &
REACT_PID=$!

echo ""
echo "✅ Backend Flask : http://localhost:8000/api/"
echo "✅ Frontend React : http://localhost:3000"
echo ""
echo "Ctrl+C pour arrêter"

trap "kill $FLASK_PID $REACT_PID 2>/dev/null; exit" INT
wait
