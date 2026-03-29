# R-Home — Presentazione

## Il problema
"Come possiamo aiutare un giovane in trasferta a decidere cosa fare quando il mezzo che sta aspettando non arriva, senza restare bloccato alla fermata?"

A Roma, chi si muove a piedi o con i mezzi pubblici non ha un unico punto dove trovare:
- Lo stato reale dei trasporti (non quello teorico di ATAC)
- Le strade chiuse o i pericoli sul percorso
- Le condizioni meteo zona per zona
- Le notizie su scioperi ed eventi che impattano la mobilita

## La soluzione: R-Home
Un'app web che combina dati in tempo reale, segnalazioni della community e intelligenza artificiale per aiutare pedoni e utenti dei mezzi pubblici a muoversi per Roma.

## Come funziona

### 1. Mappa in tempo reale
- Google Maps con geolocalizzazione sempre attiva
- Layer traffico per vedere la situazione stradale
- Percorsi A→B ottimizzati per pedoni e mezzi pubblici (bus, metro, tram)

### 2. Segnalazioni community (stile Waze)
Tre bottoni sempre visibili sulla mappa:
- **Strada chiusa** (arancione) — segnala un blocco sul percorso
- **Pericolo** (rosso) — segnala una situazione pericolosa
- **Rallentamento** (giallo) — segnala code o ritardi
Un tap dalla propria posizione GPS. Nessuna registrazione, nessun form.
Le segnalazioni appaiono sulla mappa solo quando sono rilevanti: zoomando sulla zona o se cadono lungo il percorso pianificato.

### 3. Radar meteo iper-locale
- Overlay radar precipitazioni in tempo reale (RainViewer)
- 12 zone meteo su Roma con temperatura, pioggia, vento
- Clicca una zona: vedi se piove li o no
- Alert automatici: se piove e sei a piedi, l'app suggerisce la metro

### 4. Roma Live — Notizie e marker su mappa
Scraping automatico da Google News e RomaToday per:
- **Scioperi** ATAC, Cotral, Trenitalia
- **Strade chiuse** per lavori, cantieri, incidenti
- **Eventi** che impattano la mobilita (manifestazioni, cortei, maratone)
- **Problemi trasporti** (metro interrotta, bus deviati, guasti)
Aggiornamento ogni 10 minuti.
Le notizie su chiusure stradali, pericoli e rallentamenti generano automaticamente marker sulla mappa, visibili lungo il percorso o zoomando.

### 5. Assistente AI
Chatbot integrato (R-Home AI) che:
- Conosce la rete di trasporti di Roma
- Ha accesso ai dati meteo in tempo reale
- Suggerisce alternative quando il mezzo non arriva
- Risponde a domande come "Come arrivo al Colosseo?" o "C'e' sciopero oggi?"

## Tecnologia

| Componente | Tecnologia | Costo |
|---|---|---|
| Mappa e routing | Google Maps Platform | Gratis ($200/mese credit) |
| Radar meteo | RainViewer API | Gratis, no chiave |
| Previsioni meteo | Open-Meteo API | Gratis, no chiave |
| News scraping | Google News + RomaToday RSS | Gratis |
| AI chatbot | Google Gemini 2.0 Flash | Gratis (free tier) |
| Frontend | Next.js + React + Tailwind | Open source |
| Hosting | Vercel | Gratis |

**Costo totale infrastruttura: 0 EUR**

## Dispositivi supportati
- Smartphone (iOS/Android via browser)
- Tablet
- Desktop

## Connessione con il Brainwriting
L'app implementa i cluster 1, 2 e 3 emersi dal brainwriting:
- **Cluster 1**: Rete crowdsourced di aggiornamenti in tempo reale (segnalazioni community)
- **Cluster 2**: Suggerimento proattivo di alternative (AI + meteo + news)
- **Cluster 3**: Assistente conversazionale personalizzato (chatbot Gemini)

Con elementi del Cluster 4 (navigazione pedonale smart con criteri alternativi).

## Demo live
https://bearinvention.vercel.app

## Prossimi passi (roadmap)
1. Integrazione dati GTFS reali ATAC per orari e ritardi precisi
2. Notifiche push per scioperi e problemi sulla linea preferita
3. Gamification: punti per chi segnala, badge per contributori attivi
4. Integrazione con bike/scooter sharing (Lime, Tier, Bird)
5. Scraping avanzato notizie con NLP per estrarre strade e zone impattate
6. PWA installabile come app nativa
