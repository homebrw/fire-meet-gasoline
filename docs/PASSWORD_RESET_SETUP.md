# Configuration de la Réinitialisation de Mot de Passe

Ce guide explique comment configurer la réinitialisation de mot de passe via le dashboard Supabase.

## Flux du Processus

1. **Admin dans Supabase** — Envoie un email de réinitialisation à l'utilisateur
2. **Email reçu** — L'utilisateur clique sur le lien dans l'email
3. **Page `/reset-password`** — L'utilisateur entre son nouveau mot de passe
4. **Confirmation** — Redirection vers `/login`

## Configuration Requise

### 1. Variable d'Environnement `NEXT_PUBLIC_SITE_URL`

Assurez-vous que `NEXT_PUBLIC_SITE_URL` est configurée dans `.env.local` :

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Développement
# ou
NEXT_PUBLIC_SITE_URL=https://votre-domaine.com  # Production
```

Cette URL est utilisée par Supabase pour générer le lien de réinitialisation.

### 2. Configuration Supabase Email

#### En Développement (Supabase Local)

Si vous utilisez `supabase start` localement, les emails sont affichés dans les logs Supabase.

#### En Production

Allez dans le **Supabase Dashboard** :

1. Projet → **Auth** → **Providers** → **Email**
2. Section **Email Sender** :
   - Options :
     - **Supabase Email** (par défaut, 100 emails/jour max)
     - **Custom SMTP** (recommandé pour la production)

3. Section **Email Templates** (optionnel) :
   - **Auth** → **Email Templates**
   - Modifiez le template "Reset Password (magic link)" si nécessaire
   - Par défaut, le lien pointe vers `{{ .ConfirmationURL }}`

## Comment Envoyer un Email de Réinitialisation

### Via le Dashboard Supabase

1. Allez dans **Supabase Dashboard** → Votre Projet
2. **Auth** → **Users**
3. Trouvez l'utilisateur
4. Cliquez sur les **3 points** (menu)
5. Sélectionnez **"Send password reset email"**
6. L'email sera envoyé à l'utilisateur

### Via Node.js/CLI (optionnel)

```bash
# Installer Supabase CLI
npm install -g supabase

# Configurer votre projet
supabase projects list

# Envoyer un email via la CLI
supabase auth admin send-recovery-email --email user@example.com --project-ref xxxxx
```

## Flux Détaillé

### Dashboard Supabase → Envoi d'Email

1. Admin clique sur "Send password reset email"
2. Supabase génère un token de réinitialisation
3. Email envoyé avec lien : `https://votre-app.com/reset-password?token=xyz&type=recovery`

### Page `/reset-password`

1. **Validation du token** (`useEffect`)
   - Supabase vérifie le token dans l'URL
   - Si valide, crée une session d'authentification temporaire
   - Si expiré/invalide, affiche un message d'erreur

2. **Mise à jour du mot de passe** (`handleSubmit`)
   - L'utilisateur entre son nouveau mot de passe
   - Appelle `supabase.auth.updateUser({ password })`
   - Redirige vers `/login` après succès

## Erreurs Courantes

### "Le lien ne fonctionne pas"

- Vérifiez que `NEXT_PUBLIC_SITE_URL` est correct dans `.env.local`
- En production, l'URL doit correspondre à votre domaine réel
- Les mises à jour de cette variable nécessitent un redémarrage de l'app

### "Lien expiré"

- Les tokens Supabase expirent après 24 heures par défaut
- L'utilisateur doit demander un nouveau lien à l'admin
- Vous pouvez modifier la durée dans Supabase → **Auth** → **Policies** (voir ci-dessous)

### "Lien invalide ou session perdue"

- Le lien n'a pas été cliqué avec la bonne session
- Essayez d'accéder au lien dans une fenêtre incognito
- Vérifiez que les cookies sont activés

## Sécurité

✅ **Bonnes pratiques implémentées** :
- Tokens PKCE à usage unique (géré par Supabase)
- Validation côté client et serveur
- HTTPS requis en production
- Expiration des tokens (24h par défaut)
- Les mots de passe ne sont jamais stockés en clair
- Seul l'admin peut déclencher la réinitialisation

## Configuration Avancée

### Modifier la Durée d'Expiration du Token

Dans Supabase Dashboard → **Auth** → **Policies** :
- Cherchez **"MAILER_OTP_EXP"** (durée en secondes)
- Par défaut : 86400 secondes (24 heures)
- Exemple pour 1 heure : `3600`

### Modifier le Template Email

**Auth** → **Email Templates** → **Reset Password (magic link)** :

```html
<p>Bonjour,</p>
<p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
<a href="{{ .ConfirmationURL }}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
  Réinitialiser mon mot de passe
</a>
<p style="color: #666; font-size: 12px;">Ce lien expirera dans 24 heures.</p>
```

## Routes Autorisées

La route suivante n'a pas besoin d'authentification :
- `/reset-password` — Accessible avec un token valide de Supabase

Gérée dans `proxy.ts` pour permettre l'accès aux utilisateurs sans session.

## Support

Si vous avez besoin d'aide :
- Supabase Docs: https://supabase.com/docs/guides/auth/managing-user-data#user-management-endpoints
- Vérifiez les logs du projet Supabase (Auth → Logs)
- Consultez Next.js SSR: https://supabase.com/docs/guides/auth/server-side-rendering
