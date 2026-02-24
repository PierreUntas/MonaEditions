# Configuration Pinata pour IPFS

## Pourquoi Pinata ?

Pinata est une alternative fiable et populaire à Thirdweb pour l'upload de fichiers sur IPFS. Le service offre :

- ✅ Un plan gratuit généreux (1 Go de stockage, 100 Mo de bande passante/mois)
- ✅ Une API simple et bien documentée
- ✅ Une gateway IPFS rapide et fiable
- ✅ Des outils de gestion de fichiers
- ✅ Support actif et SDK maintenu

## Comment obtenir votre clé API Pinata

### 1. Créer un compte Pinata

Rendez-vous sur [https://www.pinata.cloud/](https://www.pinata.cloud/) et créez un compte gratuit.

### 2. Générer une clé API (JWT)

1. Connectez-vous à votre compte Pinata
2. Allez dans **API Keys** (https://app.pinata.cloud/developers/api-keys)
3. Cliquez sur **New Key** (ou **Generate New Key**)
4. Configurez les permissions :
   - **Admin** : Cochez si vous voulez un accès complet (recommandé pour le développement)
   - Ou sélectionnez uniquement **pinFileToIPFS** et **pinJSONToIPFS** pour plus de sécurité
5. Donnez un nom à votre clé (ex: "Kigen Dev")
6. Cliquez sur **Generate Key**
7. **IMPORTANT** : Copiez immédiatement le JWT (vous ne pourrez plus le voir après)

### 3. Configurer votre projet

1. Ouvrez le fichier `.env.local` à la racine du dossier `frontend`
2. Remplacez `your_pinata_jwt_here` par votre JWT :

```bash
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI...
```

### 4. Pour la production (Vercel)

Si vous déployez sur Vercel :

1. Allez dans les paramètres de votre projet Vercel
2. **Settings** → **Environment Variables**
3. Ajoutez une nouvelle variable :
   - **Name** : `PINATA_JWT`
   - **Value** : Votre JWT Pinata
   - **Environments** : Cochez Production, Preview, et Development
4. Redéployez votre application

## Test de la configuration

Pour vérifier que tout fonctionne :

```bash
cd frontend
npm run dev
```

Essayez d'uploader un fichier via votre interface. Vous devriez voir dans les logs :

```
🚀 Utilisation de Pinata pour l'upload IPFS
📦 FormData received
📦 Fichier reçu: mon-fichier.json 1234
✅ Pinata upload result: { IpfsHash: 'Qm...', PinSize: 1234, ... }
```

## Dépannage

### Erreur "PINATA_JWT n'est pas configuré"

- Vérifiez que le fichier `.env.local` existe
- Vérifiez que la variable `PINATA_JWT` est bien définie
- Redémarrez le serveur de développement (`npm run dev`)

### Erreur "Unauthorized" ou "Invalid JWT"

- Vérifiez que vous avez copié le JWT complet
- Assurez-vous qu'il n'y a pas d'espaces avant ou après le JWT
- Générez une nouvelle clé API si nécessaire

### Les fichiers ne s'affichent pas

- Vérifiez que l'upload retourne bien un CID (Hash)
- Testez l'accès au fichier via : `https://gateway.pinata.cloud/ipfs/VOTRE_CID`
- La propagation IPFS peut prendre quelques secondes

## Ressources

- [Documentation Pinata](https://docs.pinata.cloud/)
- [SDK Pinata pour Node.js](https://github.com/PinataCloud/pinata-node)
- [Dashboard Pinata](https://app.pinata.cloud/)

