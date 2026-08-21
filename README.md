# Guest requests

Webapp per richieste ospite in hotel (cuscini, asciugamani, pulizia, manutenzione…)
senza account ospite, con dashboard staff condivisa fra housekeeping e reception.

## Struttura

```
apps/web/            React + Vite + TypeScript strict, Tailwind v4
supabase/migrations/  schema Postgres, RLS, funzioni RPC
supabase/functions/   Edge Function per la creazione account operatore
supabase/seed.sql     hotel demo + camera 304 + soggiorno + menu richieste
```

## Setup

1. Crea un progetto Supabase, poi applica le migration in ordine:
   `supabase db push` (o incolla i file `supabase/migrations/*.sql` in ordine nel SQL editor).
2. Deploya la Edge Function: `supabase functions deploy create-staff-account`.
3. Crea il primo account **admin** a mano (non c'è un flusso self-service, di proposito):
   - crea un utente in Authentication → Users con email/password;
   - inserisci la riga corrispondente in `staff_profiles` con `role = 'admin'`,
     `department = null`, `hotel_id` dell'hotel che hai creato.
   Da lì in poi l'admin crea gli operatori dalla UI (Gestione → Staff).
4. Copia `apps/web/.env.example` in `apps/web/.env` e compila:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (dal progetto Supabase);
   - `VITE_HOTEL_ID` (id della riga in `hotels`).
5. `cd apps/web && npm install && npm run dev`.

Per provare in locale senza un hotel reale, `supabase/seed.sql` crea un hotel
demo, la camera `304` con un soggiorno attivo intestato a `Rossi`, e il menu
di richieste di base.

## Cosa è deliberatamente semplice (per ora)

- **Notifiche ed escalation** (nuova richiesta, non presa in carico dopo 3
  minuti, non completata dopo 10 minuti dalla presa in carico) girano nel
  browser dello staff, non su un cron server-side: funzionano finché la
  dashboard resta aperta su almeno un dispositivo, come previsto per l'MVP.
  Un'escalation davvero server-side (utile se nessuno ha la dashboard
  aperta) richiederebbe un job schedulato + un canale push/SMS/email — è un
  passo successivo, non incluso qui.
- **Stato ospite in tempo reale** usa polling (ogni 12s), non Realtime:
  l'anon key non ha alcun accesso diretto a `guest_requests` (solo RPC), e
  Supabase Realtime rispetta le stesse RLS — non c'è un modo pulito di
  spingere eventi a un client anon scoped al proprio token senza un vero JWT
  per l'ospite. Lato staff invece Realtime è attivo, perché l'account è un
  utente Supabase Auth reale con RLS proprie.
- **Categorie/tipi di richiesta** si modificano solo via SQL/seed per ora:
  non c'è ancora una UI admin per crearle o riordinarle.
