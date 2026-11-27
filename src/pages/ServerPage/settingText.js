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
    case 'transcoder.h264.crf':
      return {
        title: t('H.264 quality (CRF)'),
        description: t(
          'The picture quality the server aims for on every video it converts to H.264, from 0 (lossless) to 51 (coarsest). A lower number gives a sharper picture and uses more of the bandwidth, never beyond the bitrate of the quality the player asked for. Leave it empty for Automatic: each quality keeps its own factor, from 16 to 24. Applies from the next playback.',
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

/**
 * What an integer setting's field holds, in canonical form: `''` for none when the setting
 * takes it, `undefined` when it is not a whole number within the setting's bounds.
 */
export function integerValue(setting, text) {
  const trimmed = text.trim();
  if (trimmed === '') return setting.optional ? '' : undefined;
  if (!/^-?\d+$/.test(trimmed)) return undefined;
  const number = BigInt(trimmed);
  if (setting.minimum != null && number < BigInt(setting.minimum)) return undefined;
  if (setting.maximum != null && number > BigInt(setting.maximum)) return undefined;
  return number.toString();
}

/** Why the server refused a value, in the terms of the setting's kind. */
export function invalidText(t, setting) {
  if (setting.kind === 'ADDRESS') return t('The address must look like https://host:port, with nothing after it.');
  if (setting.kind === 'INTEGER') {
    const bounds = { minimum: setting.minimum, maximum: setting.maximum };
    return setting.optional
      ? t('Enter a whole number from {{minimum}} to {{maximum}}, or leave it empty.', bounds)
      : t('Enter a whole number from {{minimum}} to {{maximum}}.', bounds);
  }
  return t('The server does not accept this value.');
}
