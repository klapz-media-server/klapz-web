/**
 * The title and explanation of a server setting, in the interface's language. A key the
 * client does not know yet shows as the server describes it, in English.
 */
export function settingText(t, setting) {
  switch (setting.key) {
    case 'general.public_url':
      return {
        title: t('Public address'),
        description: t(
          'The address the server is reached at from outside your network, such as a domain or a tunnel leading to it. Leave it empty if the server is only used at home.',
        ),
      };
    case 'transcoder.h264.preset':
      return {
        title: t('H.264 encoding preset'),
        description: t(
          'How hard the server works on every video it converts to H.264. A slower preset gives a sharper or smaller picture at the same bitrate but uses more processor time; too slow a one cannot keep up with playback. Applies from the next playback.',
        ),
      };
    default:
      return { title: setting.key, description: setting.description };
  }
}

/** Why the server refused a value, in the terms of the setting's kind. */
export function invalidText(t, setting) {
  if (setting.kind === 'ADDRESS') return t('The address must look like https://host:port, with nothing after it.');
  return t('The server does not accept this value.');
}
