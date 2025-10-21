# MoniTrack 📈

MoniTrack est une application de tableau de bord financier personnel conçue pour fonctionner entièrement en local. Elle vous permet de suivre vos actifs, votre budget et de visualiser des projections financières sans jamais envoyer vos données à un serveur externe.

### Fonctionnalités

*   **Dashboard Principal** : Vue d'ensemble de votre patrimoine net, de vos actifs et de votre budget.
*   **Suivi de Marché** : Watchlist pour les actions, ETFs et cryptomonnaies via des API publiques.
*   **Gestion de Patrimoine** : Ajoutez manuellement vos comptes bancaires, biens immobiliers, actions et cryptos.
*   **Budget & Cashflow** : Saisissez vos revenus et dépenses pour visualiser votre cashflow mensuel.
*   **Projection Financière** : Un graphique simple pour estimer la croissance de votre patrimoine.
*   **100% Local & Privé** : Toutes vos données sont stockées dans un fichier de base de données SQLite sur votre ordinateur.

### Stack Technique

*   **Frontend** : React + Vite
*   **Backend** : Node.js + Express
*   **Base de Données** : SQLite (stockage local dans le dossier `/data`)
*   **Graphiques** : Recharts
*   **API Externes** : Yahoo Finance (via un proxy) & CoinGecko

---

### Installation et Lancement

Suivez ces étapes pour lancer l'application sur votre machine.

#### Prérequis

*   [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)
*   [npm](https://www.npmjs.com/) (généralement inclus avec Node.js)

#### 1. Cloner le Projet

Si vous avez reçu ce projet dans une archive, décompressez-la. Sinon, clonez le dépôt :
```bash
# Non applicable si vous avez déjà les fichiers
git clone <URL_DU_REPO>
cd moni-track-app
```

#### 2. Installer les Dépendances

Ouvrez un terminal **à la racine du projet** (`/moni-track-app`) et exécutez la commande suivante. Elle installera les dépendances pour le projet racine, le backend et le frontend en une seule fois.

```bash
npm run install-all
```
Cette commande peut prendre une ou deux minutes.

#### 3. Lancer l'Application

Toujours depuis la racine du projet, lancez l'application avec la commande :

```bash
npm run dev
```

Cette commande va :
1.  Lancer le serveur backend sur `http://localhost:3001`.
2.  Lancer le serveur de développement frontend sur `http://localhost:5173` (ou un port disponible).
3.  Ouvrir automatiquement l'application dans votre navigateur par défaut.

Le terminal affichera les logs des deux serveurs. Vous pouvez maintenant utiliser l'application ! La base de données `database.sqlite` sera automatiquement créée dans le dossier `/data` au premier lancement.

#### 4. Arrêter l'Application

Pour arrêter les deux serveurs, retournez dans le terminal où `npm run dev` est en cours d'exécution et appuyez sur `Ctrl + C`.