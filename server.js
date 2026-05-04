const express = require('express');
const session = require('express-session');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const MOT_DE_PASSE_ADMIN = process.env.ADMIN_PASSWORD || 'telecon2024';

const DOSSIER_DATA = '.data';
const FICHIER_DATA = path.join(DOSSIER_DATA, 'presences.json');

if (!fs.existsSync(DOSSIER_DATA)) fs.mkdirSync(DOSSIER_DATA);
if (!fs.existsSync(FICHIER_DATA)) fs.writeFileSync(FICHIER_DATA, '[]');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'Public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'telecon-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));

function lire() {
  try { return JSON.parse(fs.readFileSync(FICHIER_DATA, 'utf8')); }
  catch { return []; }
}

function sauver(data) {
  fs.writeFileSync(FICHIER_DATA, JSON.stringify(data, null, 2));
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'formulaire.html'));
});

app.post('/api/presence', (req, res) => {
  const { employe, date, arrivee, depart, projet } = req.body;
  if (!employe || !date || !arrivee) {
    return res.status(400).json({ erreur: 'Champs requis manquants.' });
  }
  const presences = lire();
  presences.push({
    id: Date.now(),
    employe: employe.trim(),
    date, arrivee,
    depart: depart || '',
    projet: projet || '',
    soumisLe: new Date().toISOString()
  });
  sauver(presences);
  res.json({ ok: true });
});

app.get('/admin', (req, res) => {
  if (req.session.admin) {
    res.sendFile(path.join(__dirname, 'Opinions', 'admin.html'));
  } else {
    res.sendFile(path.join(__dirname, 'Opinions', 'login.html'));
  }
});

app.post('/admin/login', (req, res) => {
  if (req.body.password === MOT_DE_PASSE_ADMIN) {
    req.session.admin = true;
    res.redirect('/admin');
  } else {
    res.redirect('/admin?erreur=1');
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin');
});

app.get('/api/presences', (req, res) => {
  if (!req.session.admin) return res.status(401).json({ erreur: 'Non autorisé.' });
  res.json(lire());
});

app.delete('/api/presence/:id', (req, res) => {
  if (!req.session.admin) return res.status(401).json({ erreur: 'Non autorisé.' });
  sauver(lire().filter(p => p.id !== parseInt(req.params.id)));
  res.json({ ok: true });
});

app.listen(PORT, () => console.log('Serveur TELECON démarré sur le port', PORT));
