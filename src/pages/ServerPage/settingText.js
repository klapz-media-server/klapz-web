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
    case 'transcoder.h264.crf':
      return {
        title: t('H.264 quality (CRF)'),
        description: t(
          'The picture quality the server aims for on every video it converts to H.264, from 0 (lossless) to 51 (coarsest). A lower number gives a sharper picture and uses more of the bandwidth, never beyond the bitrate of the quality the player asked for. Leave it empty for Automatic: each quality keeps its own factor, from 16 to 24. Applies from the next playback.',
        ),
      };
    case 'analysis.deep':
      return {
        title: t('Deep analysis'),
        description: t(
          'Reads every packet of each file once its headers are, to measure the bitrate of its tracks and its duration rather than trust what the file declares. It reads the whole file.',
        ),
      };
    case 'analysis.subtitles':
      return {
        title: t('Subtitle extraction'),
        description: t(
          'Extracts the subtitle tracks inside each file to files of their own, so they are served without reading the video. A copy of a file already done is not done again. It reads the whole file.',
        ),
      };
    case 'analysis.preview_thumbnails':
      return {
        title: t('Seeking thumbnails'),
        description: t(
          'Makes the pictures shown above the seek bar, one every two seconds of each video (BIF). A copy of a file already done is not done again. It decodes every key frame of the video.',
        ),
      };
    case 'analysis.concurrency.headers':
      return { title: t('Quick analyses at once'), description: t('How many files have their headers read at the same time, over every library.') };
    case 'analysis.concurrency.deep':
      return { title: t('Deep analyses at once'), description: t('How many files are read in full at the same time, over every library.') };
    case 'analysis.concurrency.subtitles':
      return { title: t('Subtitle extractions at once'), description: t('How many files have their subtitles extracted at the same time, over every library.') };
    case 'analysis.concurrency.preview_thumbnails':
      return {
        title: t('Thumbnail generations at once'),
        description: t('How many videos have their seeking thumbnails made at the same time, over every library.'),
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

/**
 * The tasks the analysis runs on each file, in the order it runs them: the setting turning each
 * on (`null` for the quick analysis, always made) and the one setting how many run at once.
 */
export const ANALYSIS_TASKS = [
  { id: 'headers', toggle: null, concurrency: 'analysis.concurrency.headers' },
  { id: 'deep', toggle: 'analysis.deep', concurrency: 'analysis.concurrency.deep' },
  { id: 'subtitles', toggle: 'analysis.subtitles', concurrency: 'analysis.concurrency.subtitles' },
  { id: 'preview_thumbnails', toggle: 'analysis.preview_thumbnails', concurrency: 'analysis.concurrency.preview_thumbnails' },
];

/** The quick analysis has no setting of its own to describe it: it is always made. */
export function quickAnalysisText(t) {
  return {
    title: t('Quick analysis'),
    description: t(
      'Reads the headers of each file as soon as it is found, with its name, size and hashes: the file then shows its tracks and its duration, and plays without waiting. Always made.',
    ),
  };
}

/** Why the server refused a value, in the terms of the setting's kind. */
export function invalidText(t, setting) {
  if (setting.kind === 'ADDRESS') return t('The address must look like https://host:port, with nothing after it.');
  if (setting.kind === 'INTEGER' && setting.minimum != null && setting.maximum != null) {
    const bounds = { minimum: setting.minimum, maximum: setting.maximum };
    return setting.optional
      ? t('Enter a whole number from {{minimum}} to {{maximum}}, or leave it empty.', bounds)
      : t('A whole number from {{minimum}} to {{maximum}}.', bounds);
  }
  return t('The server does not accept this value.');
}
