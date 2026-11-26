import type { TranslationKey } from './index.js';

export const it: Record<TranslationKey, string> = {
  // --- DM inviato all'utente compromesso ---
  'dm.title': 'Il tuo account potrebbe essere stato compromesso',
  'dm.body':
    'Ciao {user}, **Dity Security** ha rilevato che il tuo account ha inviato lo stesso messaggio in più canali di **{guild}** nel giro di pochi secondi. È un segnale tipico di un account hackerato.\n\nI messaggi sono stati eliminati.',
  'dm.timedOut': 'Per precauzione sei stato messo in timeout su **{guild}** fino al {until}.',
  'dm.stepsTitle': 'Cosa fare adesso',
  'dm.steps':
    '1. Cambia subito la password di Discord\n' +
    "2. Attiva l'autenticazione a due fattori (2FA)\n" +
    '3. Vai in **Impostazioni → Dispositivi** ed esci da tutti i dispositivi che non riconosci\n' +
    '4. Vai in **Impostazioni → App autorizzate** e rimuovi tutto ciò che non riconosci\n' +
    '5. Non scansionare mai codici QR e non aprire file inviati da persone di cui non ti fidi',
  'dm.footer': "Una volta messo in sicurezza l'account, contatta i moderatori del server per far rimuovere il timeout.",
  'dm.noteHeader': '📝 **Messaggio dai moderatori di {guild}:**',

  // --- Report inviato nel canale di moderazione ---
  'report.title': 'Possibile account compromesso',
  'report.description': '{user} ha inviato lo stesso messaggio in {channels} canali in {seconds} secondi.',
  'report.fieldUser': 'Utente',
  'report.fieldChannels': 'Canali',
  'report.fieldContent': 'Contenuto del messaggio',
  'report.fieldActions': 'Azioni eseguite',
  'report.noText': '*(nessun testo, solo allegati)*',
  'report.attachments': '{count} allegato/i',
  'report.timeoutOk': '✅ Timeout fino al {until}',
  'report.timeoutFailed': '❌ Timeout non riuscito (permessi mancanti o ruolo troppo alto)',
  'report.deleted': '🗑️ Eliminati {deleted}/{total} messaggi',
  'report.dmOk': "✉️ Utente avvisato in DM",
  'report.dmFailed': "✉️ Impossibile inviare il DM all'utente (DM chiusi)",
  'report.removeTimeout': 'Rimuovi timeout',
  'report.timeoutRemovedBy': '🔓 Timeout rimosso da {moderator}',

  // --- Risposte ai pulsanti ---
  'button.noPermission': 'Ti serve il permesso **Metti in timeout i membri** per farlo.',
  'button.memberGone': "Quest'utente non è più nel server.",
  'button.removed': 'Timeout rimosso per {user}.',
  'button.failed': "Impossibile rimuovere il timeout: il bot non ha i permessi o l'utente ha un ruolo più alto.",

  // --- Risposte agli slash command ---
  'cmd.guildOnly': 'Questo comando può essere usato solo in un server.',
  'cmd.setChannel.done': 'I report verranno inviati in {channel}.',
  'cmd.setChannel.missingPerms':
    'Non posso scrivere in {channel}. Assicurati che io abbia i permessi **Visualizzare il canale**, **Inviare messaggi** e **Incorporare link**.',
  'cmd.setLanguage.done': 'Lingua del server impostata su **{language}**. DM e report useranno questa lingua.',
  'cmd.setNote.done': 'Nota salvata. Verrà inviata agli utenti insieme al DM. Anteprima:',
  'cmd.setNote.cleared': 'Nota rimossa.',
  'cmd.settings.note': 'Nota nel DM',
  'cmd.settings.title': 'Impostazioni di Dity Security',
  'cmd.settings.channel': 'Canale dei report',
  'cmd.settings.language': 'Lingua',
  'cmd.settings.notSet': 'Non impostato',
  'cmd.settings.auto': '{language} (automatica, dalla lingua del server)',
  'cmd.settings.rule': 'Regola di rilevamento',
  'cmd.settings.ruleValue':
    '{threshold} messaggi identici in {seconds}s in almeno {channels} canali → timeout di {timeout}',
  'cmd.settings.warning': '⚠️ Nessun canale dei report impostato: usa `/set-channel` per ricevere i report.',
  'cmd.error': "Si è verificato un errore durante l'esecuzione del comando.",

  'language.en': 'English',
  'language.it': 'Italiano',
};
