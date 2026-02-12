# template_E-commerce

Template et projet de site e-commerce développé from scratch avec Node.js.

Ce projet sert à construire une vraie plateforme e-commerce moderne incluant :
- gestion des utilisateurs
- catalogue de produits
- panier
- paiement en ligne
- gestion des commandes

---

## 🎯 Objectif du projet

Créer un site e-commerce fonctionnel, sécurisé et déployable en production, permettant de vendre des produits en ligne avec paiement Stripe.

Le but est :
- d’apprendre l’architecture complète d’un vrai produit web
- de construire une base réutilisable pour de futurs projets

---

## 🧱 Stack technique

### Backend
- Node.js
- TypeScript
- Fastify
- better-sqlite3 (base de données)
- JWT (authentification)
- bcrypt (hash des mots de passe)
- Stripe (paiements)

### Frontend
- EJS
- HTML / CSS
- JavaScript / TypeScript

### Documentation & pages légales

* Markdown (.md)
* markdown-it (conversion Markdown → HTML)
* Rendu dynamique via EJS

> Les pages comme les CGV, mentions légales et politique de confidentialité seront écrites en `.md` et rendues automatiquement dans le site.

### Infrastructure
- Docker
- docker-compose
- Makefile

---

## 🗂️ Fonctionnalités prévues

### Utilisateurs
- Inscription
- Connexion
- Déconnexion
- Profil
- Historique des commandes

### Produits
- Liste des produits
- Page produit
- Stock
- Images

### Panier
- Ajouter un produit
- Modifier la quantité
- Supprimer
- Total dynamique

### Paiement
- Paiement sécurisé via Stripe
- Confirmation de paiement
- Création automatique de commande

### Commandes
- Création après paiement
- Statut (en attente, payé, livré)
- Historique utilisateur

---

## ⚖️ Conformité légale (France)

Le site devra contenir :
- Mentions légales
- Conditions Générales de Vente (CGV)
- Politique de confidentialité (RGPD)

---

## 📖 Documentation technique

- **[RECAP_SERVEUR.md](./RECAP_SERVEUR.md)** - Recap complet du serveur (interfaces, SQL, repositories, services, routes API, middlewares, config)
- **[API_TESTING.md](./API_TESTING.md)** - Guide pour tester toutes les API avec curl (+ scenario complet)

---

## 🚧 État du projet

- [x] Template technique
- [ ] Base de données
- [ ] Authentification
- [ ] Produits
- [ ] Panier
- [ ] Paiement Stripe
- [ ] Déploiement
