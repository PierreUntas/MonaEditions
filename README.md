# 🍯 Bee Block – La Ruche Numérique

Une DApp de traçabilité du miel qui restaure la confiance entre apiculteurs et consommateurs grâce à la blockchain.

> Projet de fin de formation **Développeur Blockchain** chez [Alyra](https://www.alyra.fr/)

## 📋 Présentation

**Bee Block** est une DApp de traçabilité du miel qui redonne de la confiance entre apiculteurs et consommateurs. En scannant un simple QR code sur votre pot de miel, vous accédez instantanément à son histoire : origine, producteur, lot, contexte de production.

Grâce à la blockchain, ces informations clés sont enregistrées de façon infalsifiable, et un petit token utilitaire permet de laisser des avis vérifiés, uniquement après un vrai scan. Bee Block valorise ainsi les producteurs honnêtes, lutte contre le "fake honey" et vous aide à choisir un miel dont vous pouvez vraiment être fier.

### 🔐 Système de double QR Code

- **QR Code externe** (sur l'étiquette) : Redirige vers la page d'exploration du lot pour consulter les informations de traçabilité
- **QR Code interne** (sous le couvercle) : Contient la clé secrète permettant de claim le token et de laisser un avis vérifié

Ce système garantit que seuls les acheteurs réels peuvent laisser des avis.

## 🏗️ Architecture

### Backend (Hardhat)

Le projet utilise 2 smart contracts principaux déployés sur **Sepolia Testnet** :

- **HoneyTraceStorage** : `0xc91A35b15eD0EeF1e2eD1b1Bbba6DA1FBEA2EA4d`
  - Gestion des producteurs et lots de miel
  - Stockage des métadonnées IPFS
  - Système de Merkle Tree pour la vérification

- **HoneyTokenization** : `0x888039F6C4FF0A9aB89d75368A00e49921067755`
  - Tokens ERC-1155 représentant chaque pot de miel
  - Gestion des transferts et balances

**Infrastructure** : Nœud Ethereum Sepolia auto-hébergé sur Raspberry Pi 5

```
contracts/
├── contracts/
│   ├── HoneyTokenization.sol
│   └── HoneyTraceStorage.sol
├── ignition/
│   └── modules/
│       ├── HoneyTokenization.ts
│       ├── HoneyTraceStorage.ts
│       └── HoneyTraceSystem.ts
├── test/
│   └── HoneyTraceStorage.ts
├── hardhat.config.ts
└── package.json
```

### Frontend (Next.js)

Interface utilisateur moderne construite avec Next.js 15, TypeScript et TailwindCSS.

```
frontend/
├── app/
│   ├── about/              # Page à propos
│   ├── admin/              # Interface administrateur
│   ├── consumer/           # Interface consommateur
│   │   └── claim/          # Claim de tokens
│   ├── explore/            # Exploration des lots
│   │   ├── batch/[id]/     # Détails d'un lot
│   │   └── producer/[address]/  # Profil producteur
│   ├── owner/              # Administration système
│   ├── producer/           # Interface producteur
│   │   └── batches/        # Gestion des lots
│   │       ├── create/     # Création de lot
│   │       └── page.tsx    # Liste des lots
│   └── utils/
│       └── ipfs.ts         # Utilitaires IPFS
├── components/
│   ├── shared/
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── Layout.tsx
│   │   ├── Navbar.tsx
│   │   └── NotConnected.tsx
│   └── ui/
│       └── button.tsx
├── config/
│   ├── contracts.ts        # Adresses et ABIs
│   └── wagmi.ts            # Configuration Web3
└── lib/
    ├── client.ts           # Configuration Viem
    └── utils.ts
```

## 🚀 Installation

### Prérequis

- Node.js 18+
- npm ou yarn
- MetaMask ou autre wallet Web3
- Compte ThirdWeb pour IPFS

### Backend (Contracts)

```bash
cd contracts
npm install
npx hardhat compile
```

#### Tests

```bash
npx hardhat test
npx hardhat coverage
```

#### Déploiement des contrats

```bash
# Réseau local
npx hardhat node
npx hardhat ignition deploy ignition/modules/HoneyTraceSystem.ts --network localhost

# Sepolia testnet
npx hardhat ignition deploy ignition/modules/HoneyTraceSystem.ts --network sepolia
```

### Frontend

```bash
cd frontend
npm install
```

Créer un fichier `.env.local` :

```env
# ThirdWeb pour IPFS
THIRDWEB_SECRET_KEY=votre_secret_key_thirdweb

# Nœud Ethereum personnel (Raspberry Pi 5)
NEXT_PUBLIC_PERSONNAL_RPC_URL_SEPOLIA=https://spacewolf.web3pi.link

# Adresses des smart contracts
NEXT_PUBLIC_HONEY_TOKENIZATION_ADDRESS=0x888039F6C4FF0A9aB89d75368A00e49921067755
NEXT_PUBLIC_HONEY_TRACE_STORAGE_ADDRESS=0xc91A35b15eD0EeF1e2eD1b1Bbba6DA1FBEA2EA4d
```

Lancer le serveur de développement :

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

## 🔧 Configuration

### Contrats

Les adresses des contrats sont configurées dans `frontend/config/contracts.ts` :

```typescript
export const HONEY_TRACE_STORAGE_ADDRESS = '0xc91A35b15eD0EeF1e2eD1b1Bbba6DA1FBEA2EA4d';
export const HONEY_TOKENIZATION_ADDRESS = '0x888039F6C4FF0A9aB89d75368A00e49921067755';
```

### Réseau Blockchain

Par défaut configuré sur **Sepolia**. Pour changer de réseau, modifiez :

- `contracts/hardhat.config.ts` (backend)
- `frontend/config/wagmi.ts` (frontend)

### IPFS (ThirdWeb)

1. Créer un compte sur [ThirdWeb](https://thirdweb.com)
2. Générer une clé secrète dans le dashboard
3. Configuration automatique via le SDK ThirdWeb

## 👥 Rôles utilisateurs

### 🔐 Propriétaire (Owner)


**Capacités** :
- Ajout/suppression d'admins
- Gestion des droits d'accès
- Contrôle total du système

**Interface** : `/owner`

### 👨‍💼 Admin

**Capacités** :
- Autorisation/révocation de producteurs
- Validation des enregistrements
- Modération du système

**Interface** : `/admin`

### 🐝 Producteur


**Capacités** :
- Enregistrement du profil (nom, localisation, certifications)
- Création de lots de miel avec métadonnées IPFS
- Génération de clés secrètes et Merkle tree
- Gestion de l'inventaire

**Interfaces** :
- Enregistrement : `/producer`
- Création de lot : `/producer/batches/create`
- Mes lots : `/producer/batches`

### 🛒 Consommateur

**Capacités** :
- Scan du QR code sur le pot
- Claim du token avec preuve Merkle
- Consultation de la traçabilité complète
- Dépôt d'avis vérifiés

**Interfaces** :
- Claim : `/consumer/claim`
- Explorer : `/explore/batches`

## 🔑 Workflow de traçabilité

### 1. Enregistrement du producteur

Le producteur doit d'abord s'enregistrer avec ses informations complètes :

```typescript
await addProducer(
  name,           // Nom du producteur
  location,       // Localisation
  companyNumber,  // Numéro d'immatriculation
  ipfsCID         // CID des métadonnées IPFS
);
```

**Métadonnées IPFS du producteur** :
- Nom complet
- Adresse et localisation GPS
- Numéro d'immatriculation (SIRET)
- Logo
- Photos de la miellerie/ruches
- Certifications (Bio, Label Rouge, AOP, etc.)
- Description de l'activité
- Contact

### 2. Création d'un lot

Le producteur crée un nouveau lot de miel :

```typescript
// 1. Génération de N clés secrètes uniques
const secretKeys = generateSecretKeys(amount);

// 2. Construction du Merkle Tree
const leaves = secretKeys.map(key => keccak256(key));
const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
const merkleRoot = merkleTree.getHexRoot();

// 3. Upload des métadonnées sur IPFS
const ipfsCID = await uploadToIPFS(batchMetadata);

// 4. Création du lot sur la blockchain
await addHoneyBatch(
  honeyType,    // Type de miel (Acacia, Lavande, etc.)
  ipfsCID,      // CID des métadonnées
  amount,       // Nombre de pots
  merkleRoot    // Racine du Merkle Tree
);
```

**Métadonnées IPFS du lot** :
- Identifiant unique
- Type de miel
- Période de récolte
- Date et lieu de mise en pot
- Certifications du lot
- Composition et analyses
- Format du pot (poids)
- Étiquette (PDF/image)
- Photos du lot

### 3. Distribution des clés

Le système génère automatiquement un fichier CSV contenant :

| Index | Clé secrète | Merkle Proof | URL de claim |
|-------|-------------|--------------|--------------|
| 0 | abc123... | [0x..., 0x...] | https://bee-block.vercel.app/consumer/claim?batchId=1&secretKey=abc123&merkleProof=0x... |
| 1 | def456... | [0x..., 0x...] | https://bee-block.vercel.app/consumer/claim?batchId=1&secretKey=def456&merkleProof=0x... |
| ... | ... | ... | ... |

Le producteur peut alors générer **deux QR codes par pot** :

1. **QR Code externe** (sur l'étiquette visible)
   - URL : `https://bee-block.vercel.app/explore/batch/[batchId]`
   - Permet de consulter les informations de traçabilité
   - Accessible à tous, même sans wallet

2. **QR Code interne** (sous le couvercle/opercule)
   - URL : `https://bee-block.vercel.app/consumer/claim?batchId=X&secretKey=...&merkleProof=...`
   - Permet de claim le token NFT
   - Accessible uniquement après achat et ouverture du pot
   - Nécessite un wallet connecté

### 4. Claim par le consommateur

Le consommateur scanne le QR code et accède à l'URL de claim :

```typescript
// Vérification et claim du token
await claimToken(
  batchId,      // ID du lot
  secretKey,    // Clé secrète unique
  merkleProof   // Preuve Merkle
);
```

**Vérifications effectuées** :
1. Validité de la clé secrète
2. Merkle Proof correct
3. Token non déjà réclamé
4. Lot existant

Une fois le token réclamé :
- Il est transféré au wallet du consommateur
- Il ne peut plus être réclamé par quelqu'un d'autre
- Le consommateur a accès à toutes les informations du lot

## 🔍 Explorer les lots

### Page d'exploration (`/explore`)

Fonctionnalités :
- Liste complète de tous les lots
- Filtrage par type de miel
- Recherche par producteur
- Affichage des certifications
- Compteur de tokens disponibles/réclamés

### Page détail d'un lot (`/explore/batch/[id]`)

Informations affichées :
- Toutes les métadonnées IPFS
- Informations du producteur
- Historique blockchain
- Statistiques (tokens restants, etc.)
- Photos et documents

### Page producteur (`/explore/producer/[address]`)

Informations affichées :
- Profil complet du producteur
- Tous ses lots de miel
- Certifications
- Localisation
- Contact

## 🎨 Design System

### Couleurs

```css
--yellow-bee: #F0D67B;    /* Jaune principal */
--black: #000000;          /* Noir */
--dark-gray: #666666;      /* Gris foncé */
--green-cert: #10B981;     /* Vert certifications */
```

### Typographie

- **Titres principaux** : Carbon Phyber
- **Titres secondaires** : Carbon Bold (Carbon_bl)
- **Corps de texte** : Olney Light

### Composants

- Navbar responsive avec connexion wallet
- Cards avec effets hover
- Boutons avec états (normal, hover, disabled)
- Inputs avec bordures personnalisées
- Badges pour certifications

## 📦 Technologies utilisées

### Smart Contracts

- **Solidity** ^0.8.28
- **Hardhat** - Framework de développement
- **OpenZeppelin Contracts** - Standards ERC-1155
- **Ethers.js** v6 - Interactions blockchain

### Frontend

- **Next.js** 15 - Framework React
- **TypeScript** - Typage statique
- **Wagmi** v2 - Hooks React pour Ethereum
- **Viem** - Bibliothèque TypeScript pour Ethereum
- **RainbowKit** - Connexion wallet
- **TailwindCSS** - Styling
- **MerkleTree.js** - Génération de Merkle Trees
- **Keccak256** - Fonction de hachage

### Stockage

- **IPFS** via ThirdWeb - Stockage décentralisé
- **Sepolia** - Blockchain testnet
- **Nœud Ethereum personnel** - Raspberry Pi 5 (spacewolf.web3pi.link)

## 🔐 Sécurité

### Merkle Tree

Chaque lot utilise un Merkle Tree pour :
- **Garantir l'unicité** : Chaque clé secrète est unique
- **Vérification cryptographique** : Impossible de falsifier une preuve
- **Efficacité** : Vérification en O(log n)
- **Confidentialité** : Les clés non réclamées restent secrètes

### IPFS

- **Décentralisation** : Pas de point de défaillance unique
- **Immutabilité** : Le contenu ne peut pas être modifié (CID basé sur le hash)
- **Disponibilité** : Réplication sur plusieurs nœuds

### Smart Contracts

- **Transparence** : Code source vérifiable
- **Immuabilité** : Logique non modifiable
- **Contrôles d'accès** : Modifiers pour les permissions
- **Events** : Traçabilité complète des actions

### Bonnes pratiques

Le projet utilise des **erreurs personnalisées** (custom errors) pour une meilleure gestion du gas et des messages d'erreur plus clairs :

```solidity
// HoneyTraceStorage.sol - Erreurs personnalisées
error NotOwner();
error NotAdmin();
error NotAuthorizedProducer();
error ProducerAlreadyExists();
error ProducerNotFound();
error BatchNotFound();
error InvalidMerkleProof();
error TokenAlreadyClaimed();
error InvalidAmount();
error EmptyString();
error InvalidAddress();

// Utilisation dans les modifiers
modifier onlyOwner() {
    if (msg.sender != owner) revert NotOwner();
    _;
}

modifier onlyAdmin() {
    if (!admins[msg.sender] && msg.sender != owner) revert NotAdmin();
    _;
}

modifier onlyAuthorizedProducer() {
    if (!isAuthorized[msg.sender]) revert NotAuthorizedProducer();
    _;
}

// Exemple d'utilisation
function addHoneyBatch(...) public onlyAuthorizedProducer {
    if (amount == 0) revert InvalidAmount();
    if (bytes(honeyType).length == 0) revert EmptyString();
    if (bytes(ipfsCID).length == 0) revert EmptyString();
    // ...
}
```

**Avantages des custom errors** :
- Coût en gas réduit par rapport aux `require` avec messages
- Messages d'erreur typés et explicites
- Meilleure expérience développeur avec les outils modernes

## 📱 Responsive Design

L'application est entièrement responsive :

- **Mobile** (< 768px) : 1 colonne, navigation hamburger
- **Tablet** (768px - 1024px) : 2 colonnes
- **Desktop** (> 1024px) : 3 colonnes, navigation complète

Breakpoints TailwindCSS :
```javascript
sm: '640px'
md: '768px'
lg: '1024px'
xl: '1280px'
2xl: '1536px'
```


## 🌐 Déploiement

### Frontend (Vercel)

```bash
# Installation de Vercel CLI
npm i -g vercel

# Déploiement
vercel

# Production
vercel --prod
```

Variables d'environnement à configurer sur Vercel :
- `THIRDWEB_SECRET_KEY`
- `NEXT_PUBLIC_PERSONNAL_RPC_URL_SEPOLIA`
- `NEXT_PUBLIC_HONEY_TOKENIZATION_ADDRESS`
- `NEXT_PUBLIC_HONEY_TRACE_STORAGE_ADDRESS`

### Smart Contracts (Sepolia)

Les contrats sont déjà déployés :
- HoneyTraceStorage : `0xc91A35b15eD0EeF1e2eD1b1Bbba6DA1FBEA2EA4d`
- HoneyTokenization : `0x888039F6C4FF0A9aB89d75368A00e49921067755`

Pour redéployer :

```bash
npx hardhat ignition deploy ignition/modules/HoneyTraceSystem.ts --network sepolia
```

## 📚 Ressources

### Documentation

- [Hardhat](https://hardhat.org/docs)
- [Next.js](https://nextjs.org/docs)
- [Wagmi](https://wagmi.sh)
- [Viem](https://viem.sh)
- [OpenZeppelin](https://docs.openzeppelin.com/contracts)
- [IPFS](https://docs.ipfs.tech)
- [Pinata](https://docs.pinata.cloud)

### Explorateurs

- [Sepolia Etherscan](https://sepolia.etherscan.io)
- HoneyTraceStorage : [0xF7d16F8Fb28aCFb8F11a74eC800a5f47C9CF1b24](https://sepolia.etherscan.io/address/0xF7d16F8Fb28aCFb8F11a74eC800a5f47C9CF1b24)
- HoneyTokenization : [0xE8d20d42e32FB45c8c37CED65Acee0f33ceD5D72](https://sepolia.etherscan.io/address/0xE8d20d42e32FB45c8c37CED65Acee0f33ceD5D72)

## 🚀 Roadmap

### Phase 1 ✅ (Actuelle)
- [x] Smart contracts de base
- [x] Interface producteur complète
- [x] Système de claim avec Merkle Tree
- [x] Exploration des lots
- [x] Stockage IPFS

### Phase 2 🔄 (En cours)
- [ ] Système d'avis vérifiés
- [ ] Notifications push
- [ ] Application mobile (React Native)
- [ ] Support multi-langues

### Phase 3 📋 (Prévu)
- [ ] Déploiement sur mainnet
- [ ] Marketplace de miel
- [ ] Programme de fidélité
- [ ] API publique
- [ ] Analytics avancées

## 👨‍💻 Équipe

Projet développé par Pierre Untas en formation développeur blockchain chez Alyra et 4 collaborateurs en formation consultant blockchain : Nicolas Lesty, Vincent Forli, Julien Ruiz et Etienne Regis.

## 📄 Licence

Ce projet est sous licence MIT.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📧 Contact

Pour toute question ou suggestion :
- GitHub : [@PierreUntas](https://github.com/pierreuntas)
- Email : pierre.untas@gmail.com

---

**Bee Block** – *Traçabilité, transparence, confiance* 🍯✨

*Développé avec ❤️ pour valoriser le travail des apiculteurs et protéger les consommateurs*


