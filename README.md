# Mona Editions – Certification d'Art sur Blockchain

Une plateforme de certification qui restaure la confiance entre artistes et collectionneurs grâce à la blockchain.

> Projet de fin de formation **Développeur Blockchain** chez [Alyra](https://www.alyra.fr/)

## Présentation

**Mona Editions** est une plateforme de certification d'œuvres d'art qui redonne de la confiance entre artistes et collectionneurs. En scannant un simple QR code sur une œuvre, vous accédez instantanément à son histoire : titre, artiste, édition, provenance, authenticité.

Grâce à la blockchain, ces informations sont enregistrées de façon infalsifiable. Chaque œuvre possède un certificat de propriété transférable, permettant de tracer son historique complet. Mona Editions valorise ainsi les artistes indépendants, lutte contre la contrefaçon et permet aux collectionneurs d'acquérir des œuvres avec une provenance vérifiable.

### Système de certificat numérique

- **QR Code sur l'œuvre** : Redirige vers la page de l'édition pour consulter les informations d'authenticité
- **Certificat claimable** : Contient la clé secrète permettant de claim le certificat de propriété

Ce système garantit que seuls les propriétaires légitimes peuvent recevoir leur certificat.

## Architecture

### Backend (Hardhat)

Le projet utilise 2 smart contracts principaux déployés sur **Base Mainnet** :

- **ArtworkRegistry** : Contrat principal
  - Gestion des artistes et éditions d'œuvres
  - Stockage des métadonnées IPFS
  - Système de Merkle Tree pour la distribution des certificats
  - Système d'autorisation à trois niveaux (Owner/Admin/Artist)

- **ArtworkTokenization** : Contrat ERC-1155
  - Tokens représentant les certificats d'authenticité
  - Gestion des transferts et balances
  - Un token ID = une édition d'œuvre

**Réseaux disponibles** :
- **Production** : Base Mainnet (L2 Ethereum) via Infura
- **Développement** : Sepolia Testnet via Infura/Alchemy

```
contracts/
├── contracts/
│   ├── ArtworkRegistry.sol
│   └── ArtworkTokenization.sol
├── ignition/
│   └── modules/
│       └── ArtworkCertificationSystem.ts
├── test/
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
│   ├── artist/             # Interface artiste
│   │   └── editions/       # Gestion des éditions
│   │       └── create/     # Création d'édition
│   ├── collector/          # Interface collectionneur
│   │   └── claim/          # Claim de certificats
│   ├── explore/            # Exploration des œuvres
│   │   ├── artist/[address]/ # Profil artiste
│   │   ├── artists/        # Liste des artistes
│   │   ├── edition/[id]/   # Détails d'une édition
│   │   └── editions/       # Liste des éditions
│   ├── owner/              # Administration système
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

## Installation

### Prérequis

- Node.js 18+
- npm ou yarn
- MetaMask ou autre wallet Web3
- Compte Pinata pour IPFS

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
npx hardhat ignition deploy ignition/modules/ArtworkCertificationSystem.ts --network localhost

# Base mainnet (production)
npx hardhat ignition deploy ignition/modules/ArtworkCertificationSystem.ts --network base

# Sepolia testnet (développement)
npx hardhat ignition deploy ignition/modules/ArtworkCertificationSystem.ts --network sepolia
```

### Frontend

```bash
cd frontend
npm install
```

Créer un fichier `.env` :

```env
# Environnement (development ou production)
NEXT_PUBLIC_ENVIRONMENT=production

# RPC URL - Base Mainnet
NEXT_PUBLIC_RPC_URL_BASE=https://base-mainnet.infura.io/v3/VOTRE_INFURA_KEY

# Adresses des smart contracts - Base Network
NEXT_PUBLIC_ARTWORK_REGISTRY_ADDRESS=0xB70Dda9838E6b9cdb77e6fdAdC27733C1d12289E
NEXT_PUBLIC_ARTWORK_TOKENIZATION_ADDRESS=0x65d2dfAbCF50b618e3b1084fc20c4559AAD034DA

# (Optionnel) Adresses pour Sepolia Testnet - Développement uniquement
# NEXT_PUBLIC_ARTWORK_REGISTRY_ADDRESS=0xdEB44263bCE9AE897213901B548b1B271DB99B58
# NEXT_PUBLIC_ARTWORK_TOKENIZATION_ADDRESS=0x084B23B6e9134f357714B476CA058e920DFeF176
# NEXT_PUBLIC_PERSONNAL_RPC_URL_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/VOTRE_ALCHEMY_KEY

# Pinata pour IPFS
PINATA_JWT=votre_jwt_pinata
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/

# Privy pour l'authentification
NEXT_PUBLIC_PRIVY_APP_ID=votre_privy_app_id

# Resend pour les emails (optionnel)
RESEND_API_KEY=votre_resend_api_key
```

**Variables requises** :
- `NEXT_PUBLIC_ENVIRONMENT` : Définit l'environnement (development/production)
- `NEXT_PUBLIC_RPC_URL_BASE` : URL RPC pour Base mainnet (Infura, Alchemy, etc.)
- `NEXT_PUBLIC_ARTWORK_REGISTRY_ADDRESS` : Adresse du contrat ArtworkRegistry
- `NEXT_PUBLIC_ARTWORK_TOKENIZATION_ADDRESS` : Adresse du contrat ArtworkTokenization
- `PINATA_JWT` : Token JWT Pinata pour uploader sur IPFS
- `IPFS_GATEWAY_URL` : Gateway IPFS pour récupérer les fichiers
- `NEXT_PUBLIC_PRIVY_APP_ID` : App ID Privy pour l'authentification

**Variables optionnelles** :
- `RESEND_API_KEY` : Pour l'envoi d'emails de notification
- `NEXT_PUBLIC_PERSONNAL_RPC_URL_SEPOLIA` : RPC Sepolia (Infura/Alchemy) pour le développement

Lancer le serveur de développement :

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

## Configuration

### Contrats

Les adresses des contrats sont configurées dans `frontend/config/contracts.ts` :

```typescript
export const ARTWORK_REGISTRY_ADDRESS = '0x...';
export const ARTWORK_TOKENIZATION_ADDRESS = '0x...';
```

### Réseau Blockchain

Par défaut configuré sur **Base Mainnet**. Pour changer de réseau, modifiez :

- `contracts/hardhat.config.ts` (backend)
- `frontend/config/wagmi.ts` (frontend)
- Variables d'environnement `.env`

**Réseaux disponibles** :
- **Base Mainnet** (production) - L2 avec frais réduits
- **Sepolia Testnet** (développement) - Pour les tests

### IPFS (Pinata)

1. Créer un compte sur [Pinata](https://pinata.cloud)
2. Générer un JWT dans le dashboard API Keys
3. Ajouter le JWT dans `.env.local`

## Rôles utilisateurs

### Propriétaire (Owner)


**Capacités** :
- Ajout/suppression d'admins
- Gestion des droits d'accès
- Contrôle total du système

**Interface** : `/owner`

### Admin

**Capacités** :
- Autorisation/révocation d'artistes
- Validation des enregistrements d'œuvres
- Modération du système

**Interface** : `/admin`

### Artiste

**Capacités** :
- Enregistrement du profil (nom, bio, style artistique)
- Création d'éditions d'œuvres avec métadonnées IPFS
- Génération de clés secrètes et Merkle tree pour certificats
- Gestion de son catalogue d'œuvres

**Interfaces** :
- Profil : `/artist`
- Création d'édition : `/artist/editions/create`
- Mes éditions : `/artist/editions`

### Collectionneur

**Capacités** :
- Scan du QR code sur l'œuvre
- Claim du certificat avec preuve Merkle
- Consultation de l'historique et provenance
- Transfert du certificat lors de revente

**Interfaces** :
- Claim : `/collector/claim`
- Explorer : `/explore/editions`

## Workflow de certification

### 1. Enregistrement de l'artiste

L'artiste doit d'abord s'enregistrer avec ses informations complètes :

```typescript
await addArtist(
  name,           // Nom de l'artiste
  ipfsCID         // CID des métadonnées IPFS
);
```

**Métadonnées IPFS de l'artiste** :
- Nom complet / Nom d'artiste
- Biographie
- Style artistique
- Photo de profil
- Photos d'atelier
- Expositions et récompenses
- Site web et réseaux sociaux
- Contact

### 2. Création d'une édition d'œuvre

L'artiste crée une nouvelle édition :

```typescript
// 1. Génération de N clés secrètes uniques (une par certificat)
const secretKeys = generateSecretKeys(editionSize);

// 2. Construction du Merkle Tree
const leaves = secretKeys.map(key => keccak256(key));
const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
const merkleRoot = merkleTree.getHexRoot();

// 3. Upload des métadonnées sur IPFS
const ipfsCID = await uploadToIPFS(editionMetadata);

// 4. Création de l'édition sur la blockchain
await createArtworkEdition(
  title,        // Titre de l'œuvre
  ipfsCID,      // CID des métadonnées
  editionSize,  // Nombre d'exemplaires
  merkleRoot    // Racine du Merkle Tree
);
```

**Métadonnées IPFS de l'édition** :
- Titre de l'œuvre
- Catégorie (Peinture, Sculpture, Photo, etc.)
- Médium / Technique
- Dimensions
- Année de création
- Description / Déclaration de l'artiste
- Photos de l'œuvre (plusieurs angles)
- Taille de l'édition
- Numérotation

### 3. Distribution des clés

Le système génère automatiquement un fichier CSV contenant :

| Index | Clé secrète | Merkle Proof | URL de claim |
|-------|-------------|--------------|--------------|
| 0 | abc123... | [0x..., 0x...] | https://www.monaeditions.com/collector/claim?editionId=1&secretKey=abc123&merkleProof=0x... |
| 1 | def456... | [0x..., 0x...] | https://www.monaeditions.com/collector/claim?editionId=1&secretKey=def456&merkleProof=0x... |
| ... | ... | ... | ... |

L'artiste peut alors générer **des QR codes pour chaque exemplaire** :

1. **QR Code sur l'œuvre** (visible au dos ou au côté)
   - URL : `https://www.monaeditions.com/explore/edition/[editionId]`
   - Permet de consulter les informations d'authenticité
   - Accessible à tous, même sans wallet

2. **QR Code du certificat** (document séparé remis à l'acheteur)
   - URL : `https://www.monaeditions.com/collector/claim?editionId=X&secretKey=...&merkleProof=...`
   - Permet de claim le certificat numérique
   - Accessible uniquement au propriétaire légitime
   - Nécessite une connexion (email ou wallet)

### 4. Claim par le collectionneur

Le collectionneur scanne le QR code et accède à l'URL de claim :

```typescript
// Vérification et claim du certificat
await claimCertificate(
  editionId,    // ID de l'édition
  secretKey,    // Clé secrète unique
  merkleProof   // Preuve Merkle
);
```

**Vérifications effectuées** :
1. Validité de la clé secrète
2. Merkle Proof correct
3. Certificat non déjà réclamé
4. Édition existante

Une fois le certificat réclamé :
- Il est transféré au compte du collectionneur
- Il ne peut plus être réclamé par quelqu'un d'autre
- Le collectionneur a accès à toutes les informations de l'œuvre
- Le certificat peut être transféré lors d'une revente

## Explorer les œuvres

### Page d'exploration (`/explore/editions`)

Fonctionnalités :
- Liste complète de toutes les éditions
- Filtrage par catégorie artistique
- Recherche par artiste
- Affichage des œuvres disponibles
- Compteur de certificats disponibles/réclamés

### Page détail d'une édition (`/explore/edition/[id]`)

Informations affichées :
- Toutes les métadonnées IPFS
- Informations de l'artiste
- Historique blockchain
- Statistiques (certificats restants, etc.)
- Photos de l'œuvre

### Page artiste (`/explore/artist/[address]`)

Informations affichées :
- Profil complet de l'artiste
- Toutes ses éditions d'œuvres
- Style et démarche artistique
- Expositions
- Contact

## Design System

### Couleurs

```css
--beige-warm: #f5f3ef;     /* Beige chaud (fond) */
--beige-light: #fafaf8;    /* Beige clair (cards) */
--stone: #78716c;          /* Pierre (texte secondaire) */
--charcoal: #1c1917;       /* Charbon (texte principal) */
--border: #d6d0c8;         /* Bordures */
```

### Typographie

- **Titres principaux** : Serif ()
- **Corps de texte** : Sans-serif (font-light)
- **Emphase** : Italique pour les mots clés
- **Uppercase** : Petits titres avec tracking large

### Composants

- Navbar minimaliste avec connexion Privy
- Cards avec bordures subtiles
- Boutons avec transitions douces
- Inputs avec style épuré
- Grid system pour galeries d'œuvres

## Technologies utilisées

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
- **Privy** - Authentification email + wallet
- **TailwindCSS** - Styling
- **MerkleTree.js** - Génération de Merkle Trees
- **Keccak256** - Fonction de hachage

### Stockage

- **IPFS** via Pinata - Stockage décentralisé
- **Sepolia** - Blockchain testnet
- **Nœud Ethereum personnel** - Raspberry Pi 5 (spacewolf.web3pi.link)

## Sécurité

### Merkle Tree

Chaque édition utilise un Merkle Tree pour :
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
// ArtworkRegistry.sol - Erreurs personnalisées
error NotOwner();
error NotAdmin();
error NotAuthorizedArtist();
error ArtistAlreadyExists();
error ArtistNotFound();
error EditionNotFound();
error InvalidMerkleProof();
error CertificateAlreadyClaimed();
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

modifier onlyAuthorizedArtist() {
    if (!isAuthorized[msg.sender]) revert NotAuthorizedArtist();
    _;
}

// Exemple d'utilisation
function createArtworkEdition(...) public onlyAuthorizedArtist {
    if (editionSize == 0) revert InvalidAmount();
    if (bytes(title).length == 0) revert EmptyString();
    if (bytes(ipfsCID).length == 0) revert EmptyString();
    // ...
}
```

**Avantages des custom errors** :
- Coût en gas réduit par rapport aux `require` avec messages
- Messages d'erreur typés et explicites
- Meilleure expérience développeur avec les outils modernes

## Responsive Design

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


## Déploiement

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

**Requises** :
- `NEXT_PUBLIC_ENVIRONMENT` - Environment (production)
- `NEXT_PUBLIC_RPC_URL_BASE` - RPC URL Base Mainnet
- `NEXT_PUBLIC_ARTWORK_REGISTRY_ADDRESS` - Adresse contrat Registry
- `NEXT_PUBLIC_ARTWORK_TOKENIZATION_ADDRESS` - Adresse contrat Tokenization
- `PINATA_JWT` - Token Pinata pour IPFS
- `IPFS_GATEWAY_URL` - Gateway IPFS
- `NEXT_PUBLIC_PRIVY_APP_ID` - App ID Privy

**Optionnelles** :
- `RESEND_API_KEY` - Pour les emails
- `NEXT_PUBLIC_PERSONNAL_RPC_URL_SEPOLIA` - Si vous utilisez Sepolia

### Smart Contracts

Pour déployer les contrats :

```bash
# Base Mainnet (production)
npx hardhat ignition deploy ignition/modules/ArtworkCertificationSystem.ts --network base

# Sepolia Testnet (développement)
npx hardhat ignition deploy ignition/modules/ArtworkCertificationSystem.ts --network sepolia
```

**Contrats actuellement déployés sur Base Mainnet** :
- ArtworkRegistry : `0xB70Dda9838E6b9cdb77e6fdAdC27733C1d12289E`
- ArtworkTokenization : `0x65d2dfAbCF50b618e3b1084fc20c4559AAD034DA`

Les adresses seront affichées après chaque déploiement.

## Ressources

### Documentation

- [Hardhat](https://hardhat.org/docs)
- [Next.js](https://nextjs.org/docs)
- [Wagmi](https://wagmi.sh)
- [Viem](https://viem.sh)
- [OpenZeppelin](https://docs.openzeppelin.com/contracts)
- [IPFS](https://docs.ipfs.tech)
- [Pinata](https://docs.pinata.cloud)

### Explorateurs

- [BaseScan](https://basescan.org) - Explorateur Base Mainnet
- [Sepolia Etherscan](https://sepolia.etherscan.io) - Explorateur Sepolia Testnet

**Contrats sur BaseScan** :
- [ArtworkRegistry](https://basescan.org/address/0xB70Dda9838E6b9cdb77e6fdAdC27733C1d12289E)
- [ArtworkTokenization](https://basescan.org/address/0x65d2dfAbCF50b618e3b1084fc20c4559AAD034DA)

## Roadmap

### Phase 1 (Actuelle)
- [x] Smart contracts de base
- [x] Interface artiste complète
- [x] Système de claim avec Merkle Tree
- [x] Exploration des éditions
- [x] Stockage IPFS
- [x] Authentification Privy (email + wallet)

### Phase 2 (En cours)
- [ ] Historique des transferts de certificats
- [ ] Profils publics d'artistes enrichis
- [ ] Notifications email
- [ ] Support multi-langues (FR/EN)

### Phase 3 (Prévu)
- [x] Déploiement sur Base mainnet
- [ ] Marketplace secondaire d'œuvres
- [ ] Système de royalties pour artistes
- [ ] API publique pour galeries
- [ ] Analytics avancées
- [ ] Application mobile

## Équipe

Projet développé par Pierre Untas en formation développeur blockchain chez Alyra et 4 collaborateurs en formation consultant blockchain : Nicolas Lesty, Vincent Forli, Julien Ruiz et Etienne Regis.

## Licence

Ce projet est sous licence MIT.

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## Contact

Pour toute question ou suggestion :
- GitHub : [@PierreUntas](https://github.com/pierreuntas)
- Email : pierre.untas@gmail.com



