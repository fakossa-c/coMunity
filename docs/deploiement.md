# Mise en production

Trois comptes, dans cet ordre : Supabase Cloud (base, Auth, photos), Resend (emails d'authentification),
Vercel (l'app). Les créations de comptes et la saisie des secrets se font à la main ; aucun secret
n'entre dans le dépôt. Les variables attendues sont listées dans `.env.example`.

Dans tout ce guide, `<URL-PROD>` désigne l'URL de production du projet Vercel (par exemple
`https://comunity-beta.vercel.app`, ou le domaine personnalisé qui la remplace).

## 1. Supabase Cloud

1. Créer le projet sur [supabase.com](https://supabase.com/dashboard), région **West EU (Paris)**
   (`eu-west-3`). Ranger le mot de passe de la base dans un gestionnaire de mots de passe.
2. Appliquer les migrations depuis le dépôt :

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-du-projet>   # le ref est dans l'URL du tableau de bord
   npx supabase db push
   ```

   `db push` n'applique que `supabase/migrations/` : les données de `supabase/seed.sql` restent locales.

3. Créer la résidence (SQL Editor), avec son vrai nom :

   ```sql
   insert into public.residence (nom, heure_calme)
   values ('<Nom de la résidence>', '22:00');
   ```

4. **Authentication > URL Configuration** : Site URL = `<URL-PROD>`. Les liens des emails sont
   construits à partir de cette URL ; aucune Redirect URL n'est nécessaire.
5. **Authentication > Sign In / Providers > Email**, aligné sur `supabase/config.toml` :
   « Confirm email » désactivé, « Secure email change » désactivé (le lien part vers la seule
   nouvelle adresse), longueur minimale du mot de passe 6.
6. **Authentication > Emails > Templates**, recopier sujet et contenu depuis le dépôt :

   | Modèle               | Sujet                                        | Contenu                                    |
   | -------------------- | -------------------------------------------- | ------------------------------------------ |
   | Invite user          | Vous êtes invité à rejoindre l'espace syndic | `supabase/templates/invitation.html`       |
   | Reset password       | Choisissez un nouveau mot de passe           | `supabase/templates/recuperation.html`     |
   | Change email address | Confirmez votre nouvelle adresse             | `supabase/templates/changement-email.html` |

   Les modèles par défaut ne passent pas par `/auth/confirmer` : leurs liens n'ouvrent pas la session.

## 2. Resend

1. Créer le compte sur [resend.com](https://resend.com).
2. **Domains > Add Domain** : un domaine (ou sous-domaine) dont on gère la zone DNS, région
   **Ireland (eu-west-1)**. Ajouter chez le registraire les enregistrements affichés (SPF, DKIM), puis
   attendre le statut **Verified**.
3. **API Keys > Create API Key**, permission « Sending access » limitée à ce domaine. La clé ne
   s'affiche qu'une fois : la coller directement à l'étape suivante, ne la garder nulle part ailleurs.
4. Dans Supabase, **Authentication > Emails > SMTP Settings**, activer le SMTP personnalisé :

   | Champ        | Valeur                                                          |
   | ------------ | --------------------------------------------------------------- |
   | Host         | `smtp.resend.com`                                               |
   | Port         | `465`                                                           |
   | Username     | `resend`                                                        |
   | Password     | la clé API Resend                                               |
   | Sender email | une adresse du domaine vérifié, ex. `ne-pas-repondre@<domaine>` |
   | Sender name  | coMunity                                                        |

## 3. Vercel

1. Relier le projet Vercel au dépôt : installer l'application Vercel sur le compte GitHub `fakossa-c`
   ([github.com/apps/vercel](https://github.com/apps/vercel)) avec accès au dépôt `coMunity`, puis
   **Settings > Git > Connect Git Repository**. Le compte Vercel appartient à `fakossa`, le dépôt à
   `fakossa-c` : si le dépôt n'apparaît pas dans la liste, rattacher le GitHub `fakossa-c` au compte
   Vercel (**Account Settings > Authentication**) puis recommencer.
2. **Settings > Git** : branche de production `main`. Chaque push sur une autre branche donne une
   preview.
3. **Settings > Environment Variables**, environnements **Production** et **Preview**, valeurs lues
   dans Supabase > **Project Settings > API Keys** :

   | Variable                               | Valeur                             |
   | -------------------------------------- | ---------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`             | Project URL                        |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key                    |
   | `SUPABASE_SECRET_KEY`                  | Secret key (marquer « Sensitive ») |

   Les previews utilisent donc la base de production : ce qu'on y crée est réel. Une PR qui ajoute
   une migration a une preview en erreur sur les écrans concernés tant que la migration n'est pas
   appliquée à cette base (`npx supabase db push`, voir section 1).

4. Région des fonctions : Paris (`cdg1`), fixée par `vercel.json` ; le plan Hobby autorise une région.
   Elle apparaît dans le résumé du déploiement.
5. Redéployer la production (**Deployments > Redeploy**, ou un merge sur `main`) : les variables
   `NEXT_PUBLIC_*` sont intégrées au build.

## 4. Premier membre du syndic

Choisir une adresse qui **n'est pas membre de l'équipe du projet Supabase** : elle sert aussi au test
d'email de l'étape 5. Depuis le dossier du dépôt, dans un terminal bash (Git Bash sous Windows), en
pointant le script sur la production le temps d'une commande. La clé et le mot de passe se saisissent
sans s'afficher ni rester dans l'historique :

```bash
read -rsp "Clé secrète : " CLE; echo
read -rsp "Mot de passe provisoire : " MDP; echo
NEXT_PUBLIC_SUPABASE_URL="<Project URL>" SUPABASE_SECRET_KEY="$CLE" \
  npm run syndic:amorcer -- <email> "$MDP"
unset CLE MDP
```

Les membres suivants arrivent par invitation depuis l'espace syndic.

## 5. Vérifications

1. `<URL-PROD>` affiche la page d'accueil avec le nom de la résidence.
2. Sur `<URL-PROD>/mot-de-passe-oublie`, saisir l'adresse du syndic créé à l'étape 4. L'email arrive,
   expédié depuis le domaine Resend ; son lien mène au choix du mot de passe, puis la connexion marche.
   Le SMTP intégré de Supabase n'écrit qu'aux membres de l'équipe : un email reçu ici prouve que
   Resend est branché.
   - La page répond « envoyé » même pour une adresse sans compte, sans rien envoyer : tester avec
     une adresse qui a un compte.
   - Supabase Cloud impose 60 secondes entre deux emails à la même adresse (1 seconde en local) :
     attendre avant un deuxième essai.
3. Resend > **Emails** montre l'envoi au statut « Delivered ».
4. `npx vitest run src/configuration-production.test.ts` est vert : aucune clé secrète dans les
   fichiers suivis, `vercel.json` vise Paris, `.env.example` déclare sans valeur chaque variable lue.
