# 📋 Récapitulatif Migration RainbowKit → Privy

**Date :** 14 janvier 2026  
**Projet :** Kigen - Traçabilité du art sur blockchain

---

## 🎯 Objectif

Remplacer RainbowKit par Privy pour permettre l'authentification par **email** en plus des wallets, rendant l'application plus accessible au grand public (producteurs et consommateurs de art).

---

## ✅ Modifications effectuées

### 1. **Dépendances NPM**

#### Désinstallation
```bash
npm uninstall @rainbow-me/rainbowkit
```
- Supprimé : `@rainbow-me/rainbowkit` et ses 31 packages dépendants

#### Installation
```bash
npm install @privy-io/react-auth @privy-io/wagmi --legacy-peer-deps
```
- Ajouté : `@privy-io/react-auth` (authentification)
- Ajouté : `@privy-io/wagmi` (intégration Wagmi)
- Note : `--legacy-peer-deps` utilisé pour résoudre un conflit avec `ox@0.9.6`

---

### 2. **Fichiers créés**

#### ✨ [frontend/app/PrivyProvider.tsx](frontend/app/PrivyProvider.tsx)
Nouveau provider principal remplaçant RainbowKit.

**Fonctionnalités :**
- Configuration de l'authentification Privy
- Intégration Wagmi pour la compatibilité blockchain
- Support Sepolia (testnet)
- Thème personnalisé (accent : `#fbbf24` - jaune Kigen)
- Logo personnalisé : `/originlink-logo.png`

**Méthodes de connexion :**
- ✅ Email (code OTP)
- ✅ Wallet externe (MetaMask, Coinbase, etc.)

**Wallets embarqués :**
- Création automatique pour utilisateurs connectés par email
- Configuration : `createOnLogin: "users-without-wallets"`

**Validation :**
- Message d'erreur clair si `NEXT_PUBLIC_PRIVY_APP_ID` manquant
- Interface utilisateur pour guider la configuration

#### 📄 [frontend/.env.local](frontend/.env.local)
Fichier de configuration des variables d'environnement.

```env
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=mjg6lh2t0133jr0c5vbbfypd

# Sepolia RPC URL
NEXT_PUBLIC_RPC_URL_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/your-api-key

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=dadb200892fc0800f89f564492f096da
```

#### 📄 [frontend/.env.example](frontend/.env.example)
Template pour les développeurs.

---

### 3. **Fichiers modifiés**

#### 🔄 [frontend/app/layout.tsx](frontend/app/layout.tsx)
**Avant :**
```tsx
import RainbowKitAndWagmiProvider from "@/app/RainbowKitAndWagmiProvider";
// ...
<RainbowKitAndWagmiProvider>
  <Layout>{children}</Layout>
</RainbowKitAndWagmiProvider>
```

**Après :**
```tsx
import PrivyProvider from "@/app/PrivyProvider";
// ...
<PrivyProvider>
  <Layout>{children}</Layout>
</PrivyProvider>
```

#### 🔄 [frontend/components/shared/Header.tsx](frontend/components/shared/Header.tsx)
**Avant :**
- Utilisation de `ConnectButton` de RainbowKit
- Affichage simple

**Après :**
- Hook `usePrivy()` pour l'authentification
- Affichage de l'**email** ET de l'**adresse Ethereum**
- Boutons personnalisés "Se connecter" / "Déconnexion"
- Design adapté au thème Kigen (couleur amber-400)

**Fonctionnalités :**
```tsx
const { login, logout, authenticated, user } = usePrivy();
```
- Récupération du wallet (embedded ou externe)
- Affichage email (ligne 1)
- Affichage adresse tronquée (ligne 2, format mono)

#### 🔄 [frontend/app/page.tsx](frontend/app/page.tsx)
**Avant :**
```tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';
// ...
<ConnectButton />
```

**Après :**
```tsx
import { usePrivy } from '@privy-io/react-auth';
// ...
{authenticated ? (
  <div>
    <p>Connecté en tant que</p>
    <p>{user?.email?.address}</p>
    <p>{walletAddress}</p>
    <a href="/explore/batches">Explorer Kigen</a>
  </div>
) : (
  <button onClick={login}>Se connecter</button>
)}
```

**Améliorations :**
- Affichage structuré des informations utilisateur
- Email sur une ligne
- Adresse Ethereum sur une autre ligne
- Lien vers `/explore/batches` après connexion

---

### 4. **Fichiers supprimés**

#### ❌ [frontend/app/RainbowKitAndWagmiProvider.tsx](frontend/app/RainbowKitAndWagmiProvider.tsx)
- Ancien provider RainbowKit
- Plus nécessaire avec Privy
- Supprimé pour éviter les conflits

---

## 🎨 Fonctionnalités Privy activées

### Authentification
| Méthode | Statut | Description |
|---------|--------|-------------|
| 📧 Email | ✅ Activé | Connexion par code OTP envoyé par email |
| 👛 Wallet | ✅ Activé | MetaMask, Coinbase Wallet, WalletConnect |
| 🔐 Embedded Wallet | ✅ Activé | Wallet créé automatiquement pour users email |
| 🌐 Social (Google, Twitter) | ⚪ Disponible | Peut être activé dans la config |

### Personnalisation
- **Thème :** Light
- **Couleur d'accent :** `#fbbf24` (jaune/amber Kigen)
- **Logo :** `/originlink-logo.png`
- **Réseau :** Sepolia (testnet Ethereum)

---

## 📊 Comparaison RainbowKit vs Privy

| Fonctionnalité | RainbowKit | Privy |
|----------------|------------|-------|
| Wallet externe | ✅ | ✅ |
| Email login | ❌ | ✅ |
| Social login | ❌ | ✅ |
| Embedded wallet | ❌ | ✅ |
| Account abstraction | ❌ | ✅ |
| UI personnalisable | ✅ | ✅ |
| Prix | Gratuit | Gratuit jusqu'à 1000 MAU |
| Accessibilité | Nécessite wallet | Email suffisant |

---

## 🚀 Configuration requise

### 1. Créer un compte Privy
1. Aller sur https://console.privy.io
2. Créer une nouvelle application
3. Récupérer l'`App ID` (format : `clxxxxxxxxxxxxx`)

### 2. Configurer les variables d'environnement
Éditer [frontend/.env.local](frontend/.env.local) :
```bash
NEXT_PUBLIC_PRIVY_APP_ID=votre-app-id-ici
```

### 3. Lancer l'application
```bash
cd frontend
npm run dev
```

### 4. Tester
- Ouvrir http://localhost:3000
- Cliquer sur "Se connecter"
- Choisir "Email" ou "Wallet"
- Vérifier l'affichage des informations

---

## 🎯 Avantages pour Kigen

### Pour les utilisateurs
- ✅ **Producteurs de art** : Pas besoin de comprendre Web3, connexion par email
- ✅ **Consommateurs** : Accès simplifié pour tracer leur art
- ✅ **Accessible** : Pas besoin de MetaMask ou autre wallet
- ✅ **Sécurisé** : Wallet créé automatiquement en arrière-plan

### Pour le développement
- ✅ **Compatible Wagmi** : Code existant fonctionne sans modification
- ✅ **Modern UI** : Interface plus moderne et personnalisable
- ✅ **Account Abstraction** : Prêt pour les futures fonctionnalités
- ✅ **Scalable** : Gratuit jusqu'à 1000 utilisateurs/mois

---

## 📝 Structure des fichiers

```
frontend/
├── app/
│   ├── PrivyProvider.tsx          ✨ NOUVEAU - Provider Privy
│   ├── layout.tsx                 🔄 MODIFIÉ - Import PrivyProvider
│   ├── page.tsx                   🔄 MODIFIÉ - Bouton de connexion Privy
│   └── RainbowKitAndWagmiProvider.tsx  ❌ SUPPRIMÉ
│
├── components/
│   └── shared/
│       └── Header.tsx             🔄 MODIFIÉ - Affichage email + wallet
│
├── .env.local                     ✨ NOUVEAU - Variables d'environnement
├── .env.example                   ✨ NOUVEAU - Template
└── package.json                   🔄 MODIFIÉ - Dépendances
```

---

## 🔧 Configuration avancée (optionnel)

### Ajouter des méthodes de connexion social
Dans [frontend/app/PrivyProvider.tsx](frontend/app/PrivyProvider.tsx) :
```tsx
loginMethods: ["email", "wallet", "google", "twitter", "discord"]
```

### Personnaliser l'apparence
```tsx
appearance: {
  theme: "light",
  accentColor: "#fbbf24",
  logo: "/originlink-logo.png",
  landingHeader: "Bienvenue sur Kigen",
  loginMessage: "Connectez-vous pour suivre votre art",
}
```

### Configurer les wallets embarqués
```tsx
embeddedWallets: {
  createOnLogin: "all-users", // Créer pour tous
  // ou
  createOnLogin: "users-without-wallets", // Seulement si pas de wallet
}
```

---

## ⚠️ Points d'attention

### Variables d'environnement
- ❗ `NEXT_PUBLIC_PRIVY_APP_ID` est **obligatoire**
- ❗ Le préfixe `NEXT_PUBLIC_` est nécessaire pour Next.js
- ❗ Le fichier `.env.local` est dans `.gitignore` (ne pas commiter)

### Dépendances
- ⚠️ Utilisé `--legacy-peer-deps` pour l'installation
- ⚠️ Conflit de version avec `ox` (0.8.9 vs 0.9.6)
- ✅ Fonctionne correctement malgré l'avertissement

### Cache Next.js
Si des problèmes de cache apparaissent :
```bash
rm -rf .next
npm run dev
```

---

## 📚 Documentation

### Privy
- Console : https://console.privy.io
- Documentation : https://docs.privy.io
- React SDK : https://docs.privy.io/guide/react

### Wagmi (utilisé en interne)
- Documentation : https://wagmi.sh
- Compatible avec Privy via `@privy-io/wagmi`

---

## 🐛 Résolution des problèmes

### Erreur : "Cannot initialize the Privy provider with an invalid Privy app ID"
**Solution :** Vérifier que `NEXT_PUBLIC_PRIVY_APP_ID` est défini dans `.env.local`

### Erreur : "Module not found: Can't resolve '@rainbow-me/rainbowkit'"
**Solution :** Vider le cache Next.js : `rm -rf .next && npm run dev`

### Wallet ne s'affiche pas
**Solution :** Le wallet embedded est créé après la première connexion par email. Rafraîchir la page.

---

## 🎉 Résultat final

### Fonctionnalités opérationnelles
- ✅ Connexion par email avec code OTP
- ✅ Connexion par wallet externe
- ✅ Création automatique de wallet pour users email
- ✅ Affichage email + adresse Ethereum
- ✅ Boutons personnalisés au thème Kigen
- ✅ Compatible avec tout le code Wagmi existant

### Expérience utilisateur
- 🚀 **Simple** : Email suffit pour se connecter
- 🔒 **Sécurisé** : Gestion des clés par Privy
- 🎨 **Cohérent** : Design aux couleurs de Kigen
- 📱 **Responsive** : Fonctionne sur mobile et desktop

---

## 📌 Prochaines étapes recommandées

1. **Tester en production**
   - Créer un App ID de production sur Privy
   - Tester le flow complet avec de vrais utilisateurs

2. **Ajouter des analytics**
   - Suivre les méthodes de connexion utilisées
   - Mesurer l'adoption

3. **Configurer les emails**
   - Personnaliser les emails OTP avec la marque Kigen
   - Ajouter un logo dans les emails

4. **Activer le social login** (optionnel)
   - Google pour les utilisateurs grand public
   - Twitter pour la communauté crypto

5. **Documentation utilisateur**
   - Guide pour les producteurs
   - FAQ sur la connexion par email

---

**✅ Migration réussie !**  
Kigen est maintenant accessible à tous, avec ou sans wallet Ethereum. 🐝🍯
