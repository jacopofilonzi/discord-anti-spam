export const en = {
  // --- DM sent to the compromised user ---
  'dm.title': 'Your account may have been compromised',
  'dm.body':
    'Hi {user}, **Dity Security** detected that your account sent the same message in several channels of **{guild}** within a few seconds. This is a typical sign of a hacked account.\n\nThe messages have been deleted.',
  'dm.timedOut': 'As a precaution you have been timed out in **{guild}** until {until}.',
  'dm.stepsTitle': 'What to do now',
  'dm.steps':
    '1. Change your Discord password right away\n' +
    '2. Enable two-factor authentication (2FA)\n' +
    '3. Go to **Settings → Devices** and log out of all devices you do not recognize\n' +
    '4. Go to **Settings → Authorized Apps** and remove anything you do not recognize\n' +
    '5. Never scan QR codes or open files sent by people you do not trust',
  'dm.footer': 'Once your account is secure, contact the server moderators to have the timeout removed.',
  'dm.noteHeader': '📝 **Message from the moderators of {guild}:**',

  // --- Report sent to the moderation channel ---
  'report.title': 'Possible compromised account',
  'report.description': '{user} sent the same message in {channels} channels within {seconds} seconds.',
  'report.fieldUser': 'User',
  'report.fieldChannels': 'Channels',
  'report.fieldContent': 'Message content',
  'report.fieldActions': 'Actions taken',
  'report.noText': '*(no text, attachments only)*',
  'report.attachments': '{count} attachment(s)',
  'report.timeoutOk': '✅ Timed out until {until}',
  'report.timeoutFailed': '❌ Timeout failed (missing permissions or role too high)',
  'report.deleted': '🗑️ Deleted {deleted}/{total} messages',
  'report.dmOk': '✉️ User notified via DM',
  'report.dmFailed': '✉️ Could not DM the user (DMs closed)',
  'report.removeTimeout': 'Remove timeout',
  'report.timeoutRemovedBy': '🔓 Timeout removed by {moderator}',

  // --- Button interaction replies ---
  'button.noPermission': 'You need the **Timeout Members** permission to do this.',
  'button.memberGone': 'This user is no longer in the server.',
  'button.removed': 'Timeout removed for {user}.',
  'button.failed': 'Could not remove the timeout: the bot lacks permissions or the user has a higher role.',

  // --- Slash command replies ---
  'cmd.guildOnly': 'This command can only be used inside a server.',
  'cmd.setChannel.done': 'Reports will be sent to {channel}.',
  'cmd.setChannel.missingPerms':
    'I cannot write in {channel}. Make sure I have the **View Channel**, **Send Messages** and **Embed Links** permissions there.',
  'cmd.setLanguage.done': 'Server language set to **{language}**. DMs and reports will use this language.',
  'cmd.setNote.done': 'Note saved. It will be sent to users together with the DM. Preview:',
  'cmd.setNote.cleared': 'Note removed.',
  'cmd.settings.note': 'DM note',
  'cmd.settings.title': 'Dity Security settings',
  'cmd.settings.channel': 'Report channel',
  'cmd.settings.language': 'Language',
  'cmd.settings.notSet': 'Not set',
  'cmd.settings.auto': '{language} (automatic, from server locale)',
  'cmd.settings.rule': 'Detection rule',
  'cmd.settings.ruleValue':
    '{threshold} identical messages within {seconds}s in at least {channels} channels → {timeout} timeout',
  'cmd.settings.warning': '⚠️ No report channel set: use `/set-channel` to receive reports.',
  'cmd.error': 'Something went wrong while running this command.',

  'language.en': 'English',
  'language.it': 'Italiano',
} as const;
