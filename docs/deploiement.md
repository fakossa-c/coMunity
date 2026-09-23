# Mise en production

Trois comptes, dans cet ordre : Supabase Cloud (base, Auth, photos), Resend (emails d'authentification),
Vercel (l'app). Les créations de comptes et la saisie des secrets se font à la main ; aucun secret
n'entre dans le dépôt. Les variables attendues sont listées dans `.env.example`.

URL de production actuelle : `https://comunity-beta.vercel.app` (projet Vercel `comunity`). Si un domaine
personnalisé la remplace, reporter la nouvelle URL partout où elle apparaît ci-dessous.

## 1. Supabase Cloud

- [ ] Créer le projet sur [supabase.com](https://supabase.com/dashboard), région **West EU (Paris)**
      (`eu-west-3`). Noter le mot de passe de la base dans un gestionnaire de mots de passe.
- [ ] Appliquer les migrations depuis le dépôt :

  ```bash
  npx supabase login
  npx supabase link --project-ref <ref-du-projet>   # le ref est dans l'URL du tableau de bord
  npx supabase db push
  ```

  `db push` n'applique que `supabase/migrations/` : les données de `supabase/seed.sql` restent locales.

- [ ] Créer la résidence (SQL Editor), avec le vrai nom et un code d'au moins 6 caractères à donner aux
      résidents :

  ```sql
  insert into public.residence (nom, code, heure_calme)
  values ('<Nom de la résidence>', '<CODE-RESIDENCE>', '22:00');
  ```

- [ ] **Authentication > URL Configuration** : Site URL = `https://comunity-beta.vercel.app`. Les liens
      des emails sont construits à partir de cette URL.
- [ ] **Authentication > Sign In / Providers > Email**, aligné sur `supabase/config.toml` :
      « Confirm email » désactivé, longueur minimale du mot de passe 6.
- [ ] **Authentication > Emails > Templates**, recopier sujet et contenu depuis le dépôt :

  | Modèle         | Sujet                                              | Contenu                                  |
  | -------------- | -------------------------------------------------- | ---------------------------------------- |
  | Invite user    | Vous êtes invité à rejoindre l'espace syndic       | `supabase/templates/invitation.html`     |
  | Reset password | Choisissez un nouveau mot de passe                 | `supabase/templates/recuperation.html`   |

  Sans ce changement, les liens des emails par défaut ne passent pas par `/auth/confirmer` et
  n'ouvrent pas la session.

## 2. Resend

- [ ] Créer le compte sur [resend.com](https://resend.com).
- [ ] **Domains > Add Domain** : un domaine (ou sous-domaine) dont on gère la zone DNS, région
      **Ireland (eu-west-1)**. Ajouter chez le registraire les enregistrements affichés (SPF, DKIM),
      attendre le statut **Verified**.
- [ ] **API Keys > Create API Key**, permission « Sending access » limitée à ce domaine. La clé ne
      s'affiche qu'une fois : la coller directement à l'étape suivante, ne la garder nulle part ailleurs.
- [ ] Dans Supabase, **Authentication > Emails > SMTP Settings**, activer le SMTP personnalisé :

  | Champ        | Valeur                                     |
  | ------------ | ------------------------------------------ |
  | Host         | `smtp.resend.com`                          |
  | Port         | `465`                                      |
  | Username     | `resend`                                   |
  | Password     | la clé API Resend                          |
  | Sender email | une adresse du domaine vérifié, ex. `ne-pas-repondre@<domaine>` |
  | Sender name  | coMunity                                   |

## 3. Vercel

Le projet `comunity` existe déjà (déployé en CLI). Il reste à le relier au dépôt et à lui donner ses
variables.

- [ ] Relier le dépôt : installer l'application Vercel sur le compte GitHub `fakossa-c`
      ([github.com/apps/vercel](https://github.com/apps/vercel)) avec accès au dépôt `coMunity`, puis
      **Settings > Git > Connect Git Repository**. Si le dépôt n'apparaît pas, le compte GitHub rattaché
      au compte Vercel doit avoir accès au dépôt (l'ajouter comme collaborateur).
- [ ] **Settings > Git** : branche de production `main`. Chaque push sur une autre branche donne une
      preview.
- [ ] **Settings > Environment Variables**, environnement **Production** uniquement :

  | Variable                               | Source (Supabase > Project Settings > API Keys) |
  | -------------------------------------- | ----------------------------------------------- |
  | `NEXT_PUBLIC_SUPABASE_URL`             | Project URL                                     |
  | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key                                 |
  | `SUPABASE_SECRET_KEY`                  | Secret key (marquer « Sensitive »)              |

  Les previews restent sans variables : elles s'affichent sans le nom de la résidence et n'écrivent
  jamais dans la base de production.

- [ ] Région des fonctions : fixée à Paris (`cdg1`) par `vercel.json`, autorisée sur le plan Hobby
      (une seule région). Vérifiable dans le résumé du déploiement.
- [ ] Redéployer la production (**Deployments > Redeploy**, ou un merge sur `main`) pour qu'elle
      prenne les variables.

## 4. Premier membre du syndic

Depuis le poste, en pointant le script sur la production le temps d'une commande (PowerShell) :

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "<Project URL>"
$env:SUPABASE_SECRET_KEY = Read-Host "Clé secrète"
npm run syndic:amorcer -- <email> <mot-de-passe-provisoire>
Remove-Item Env:NEXT_PUBLIC_SUPABASE_URL, Env:SUPABASE_SECRET_KEY
```

Puis choisir un vrai mot de passe par « Mot de passe oublié ». Si cette adresse n'est pas celle du
compte Supabase, c'est aussi le test d'email ci-dessous.
Les membres suivants arrivent par invitation depuis l'espace syndic.

## 5. Vérifications

- [ ] `https://comunity-beta.vercel.app` affiche la page d'accueil avec le nom de la résidence.
- [ ] « Mot de passe oublié » avec une adresse **qui n'est pas membre de l'équipe Supabase** : l'email
      arrive (expéditeur du domaine Resend), le lien mène au choix du mot de passe, la connexion marche.
      Le SMTP intégré de Supabase n'écrit qu'aux membres de l'équipe : un email reçu ici prouve que
      Resend est branché.
- [ ] Resend > **Emails** montre l'envoi au statut « Delivered ».
- [ ] Aucun secret dans le dépôt : `npx vitest run src/configuration-production.test.ts` est vert. Il
      vérifie aussi que `vercel.json` vise Paris et que `.env.example` déclare, sans valeur, chaque
      variable lue par l'app.
