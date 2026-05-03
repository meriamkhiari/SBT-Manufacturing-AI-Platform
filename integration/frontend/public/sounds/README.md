# 🔊 Sound Effects

## Fichiers requis

Placez les fichiers audio suivants dans ce dossier :

- `success.mp3` - Son de succès (analyse terminée, action réussie)
- `error.mp3` - Son d'erreur (échec d'analyse, erreur réseau)
- `notification.mp3` - Son de notification (nouveau message, alerte)
- `click.mp3` - Son de clic (optionnel)

## Format recommandé

- **Format** : MP3 ou OGG
- **Durée** : 0.5 - 1.5 secondes
- **Volume** : Normalisé à -6dB
- **Taille** : < 50 KB par fichier

## Sources gratuites

- [Freesound.org](https://freesound.org/)
- [Zapsplat.com](https://www.zapsplat.com/)
- [Mixkit.co](https://mixkit.co/free-sound-effects/)

## Utilisation

Les sons sont joués automatiquement via le store Zustand :

```javascript
import { useAppStore } from '../store/useAppStore'

const { playSound } = useAppStore()

// Jouer un son
playSound('success')
playSound('error')
playSound('notification')
```

Le volume est fixé à 30% par défaut et peut être désactivé via le toggle dans la navbar.
