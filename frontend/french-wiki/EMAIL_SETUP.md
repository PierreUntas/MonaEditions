# Configuration de l'envoi d'emails

Le formulaire de contact utilise **Resend** pour l'envoi d'emails.

## Configuration

1. **Créer un compte Resend** (gratuit) : https://resend.com/signup

2. **Obtenir une clé API** :
   - Allez sur https://resend.com/api-keys
   - Créez une nouvelle clé API
   - Copiez la clé (elle commence par `re_`)

3. **Configurer les variables d'environnement** :
   - Créez un fichier `.env.local` à la racine du dossier `frontend/`
   - Ajoutez votre clé API :
   ```bash
   RESEND_API_KEY=re_votre_cle_api_ici
   ```

4. **Configurer le domaine d'envoi** (optionnel pour la production) :
   - Dans Resend, ajoutez et vérifiez votre domaine
   - Mettez à jour la ligne `from` dans `/app/api/contact/route.ts` :
   ```typescript
   from: 'Contact <contact@votredomaine.fr>',
   ```

## Utilisation en développement

En développement, vous pouvez utiliser l'email par défaut de Resend :
- `from: 'onboarding@resend.dev'`
- Limite : 100 emails/jour gratuits
- Les emails arrivent dans votre boîte de réception

## Test

1. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

2. Accédez à http://localhost:3000/contact

3. Remplissez et envoyez le formulaire

4. Vérifiez votre boîte mail (pierre.untas@gmail.com)

## Personnalisation

Pour modifier l'email de destination, éditez `/app/api/contact/route.ts` :
```typescript
to: ['votre@email.com'],
```

## Limites du plan gratuit Resend

- 3 000 emails/mois
- 100 emails/jour
- Parfait pour un site de contact
