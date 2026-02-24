# 🚀 Guide IPFS Local pour Kigen

## ✅ Installation effectuée

IPFS (Kubo 0.39.0) a été installé via Homebrew.

## 🔧 Configuration

### 1. Initialisation (déjà fait)
```bash
ipfs init
```

### 2. Configuration CORS (nécessaire pour Next.js)
```bash
# Autoriser l'origine localhost:3000
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"]'

# Autoriser les méthodes HTTP
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'

# Autoriser les headers
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Headers '["Authorization", "Content-Type"]'
```

## 🎯 Démarrer IPFS

### Option 1: Lancement manuel (pour le développement)
```bash
ipfs daemon
```

Le daemon démarre et affiche :
- **API RPC** : http://127.0.0.1:5001
- **WebUI** : http://127.0.0.1:5001/webui (interface graphique)
- **Gateway** : http://127.0.0.1:8080 (pour lire les fichiers)

### Option 2: Service en arrière-plan (recommandé)
```bash
# Démarrer comme service
brew services start ipfs

# Arrêter le service
brew services stop ipfs

# Redémarrer
brew services restart ipfs

# Vérifier le statut
brew services list | grep ipfs
```

## 📝 Variables d'environnement

Dans votre `.env.local` :
```env
IPFS_RPC=http://127.0.0.1:5001
```

## 🧪 Tester la connexion

### Via le script de test
```bash
cd frontend
node scripts/test-ipfs-api.js
```

### Via curl
```bash
# Vérifier la version
curl -X POST http://127.0.0.1:5001/api/v0/version

# Ajouter un fichier
echo "Hello Kigen" > test.txt
curl -X POST -F file=@test.txt http://127.0.0.1:5001/api/v0/add

# Récupérer un fichier (remplacer HASH par le hash retourné)
curl -X POST "http://127.0.0.1:5001/api/v0/cat?arg=HASH"
```

### Via WebUI
Ouvrez http://127.0.0.1:5001/webui dans votre navigateur pour une interface graphique.

## 📦 Utilisation dans Next.js

### Route API exemple
```typescript
// app/api/ipfs/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // Créer un FormData pour IPFS
  const ipfsFormData = new FormData();
  ipfsFormData.append('file', file);
  
  // Upload vers IPFS local
  const response = await fetch('http://127.0.0.1:5001/api/v0/add', {
    method: 'POST',
    body: ipfsFormData,
  });
  
  const data = await response.json();
  
  return NextResponse.json({
    success: true,
    hash: data.Hash,
    url: `http://127.0.0.1:8080/ipfs/${data.Hash}`,
  });
}
```

### Depuis le frontend (si CORS est configuré)
```typescript
const uploadToIPFS = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://127.0.0.1:5001/api/v0/add', {
    method: 'POST',
    body: formData,
  });
  
  const data = await response.json();
  return data.Hash;
};
```

## 🔄 Commandes utiles

### Informations sur le nœud
```bash
# ID et adresses du nœud
ipfs id

# Peers connectés
ipfs swarm peers

# Statistiques
ipfs stats bw
```

### Gestion des fichiers
```bash
# Lister les fichiers épinglés
ipfs pin ls

# Ajouter un fichier
ipfs add fichier.json

# Récupérer un fichier
ipfs cat QmHash...

# Supprimer un pin
ipfs pin rm QmHash...
```

### Nettoyage
```bash
# Récupérer l'espace disque
ipfs repo gc

# Voir l'utilisation du stockage
ipfs repo stat
```

## ⚙️ Configuration avancée

### Augmenter la limite de stockage
```bash
# Voir la configuration actuelle
ipfs config Datastore.StorageMax

# Modifier (ex: 20GB)
ipfs config Datastore.StorageMax 20GB
```

### Désactiver la télémétrie (optionnel)
```bash
ipfs config Plugins.Plugins.telemetry.Config.Mode off
```

## 🛑 Arrêter IPFS

### Si lancé manuellement
Appuyez sur `Ctrl+C` dans le terminal.

### Si lancé comme service
```bash
brew services stop ipfs
```

## 🐛 Dépannage

### Le daemon ne démarre pas
```bash
# Voir les logs
ipfs log tail

# Vérifier le port
lsof -i :5001
```

### Erreur CORS
Vérifiez la configuration CORS :
```bash
ipfs config API.HTTPHeaders.Access-Control-Allow-Origin
```

### Réinitialiser IPFS
```bash
# ⚠️ ATTENTION : Supprime toutes les données
rm -rf ~/.ipfs
ipfs init
```

## 📊 Monitoring

### WebUI
http://127.0.0.1:5001/webui

### API Status
```bash
curl http://127.0.0.1:5001/api/v0/id
```

## 🚀 Workflow de développement

1. **Démarrer IPFS** : `brew services start ipfs`
2. **Développer** : Votre app utilise `http://127.0.0.1:5001`
3. **Tester** : Via WebUI ou script de test
4. **Production** : Migrer vers Pinata/Infura

## 📌 Notes importantes

- ✅ Le nœud local est parfait pour le développement
- ⚠️ Les fichiers ne sont persistants que sur votre machine
- 🌐 Pour la production, utilisez Pinata ou Infura
- 🔒 IPFS local n'a pas d'authentification par défaut
- 📦 Les fichiers sont automatiquement partagés sur le réseau IPFS

## 🎯 Pour Kigen

Le nœud local est idéal pour :
- ✅ Développer les fonctionnalités de traçabilité
- ✅ Tester les uploads de données de batches
- ✅ Prototyper sans limite d'API
- ✅ Travailler offline

Pour la production :
- 🚀 Migrez vers **Pinata** (stable, dashboard, gratuit 1GB)
- 📊 Utilisez les mêmes API endpoints
- 🔐 Ajoutez l'authentification JWT
