import { useTranslation } from 'react-i18next';
import { canDecodeAudio, isImageSubtitle } from '../utils/capabilities';
import { channelsLabel, formatBitrate, languageLabel } from '../utils/format';

/** Video bitrate caps offered below the source's, in bits per second. */
const BITRATE_CAPS = [20e6, 12e6, 8e6, 4e6, 2e6, 1e6, 5e5];

export function defaultAudioId(streams) {
  const audio = streams.filter((s) => s.kind === 'AUDIO');
  return (audio.find((s) => s.isDefault) ?? audio[0])?.id ?? null;
}

/** Forced subtitles in the audio's language are on by default, like Plex. */
export function defaultSubtitleId(streams, audioId) {
  const audio = streams.find((s) => s.id === audioId);
  const forced = streams.find(
    (s) =>
      s.kind === 'SUBTITLE' &&
      (s.isForced || /forced|forcé/i.test(s.title ?? '')) &&
      (!audio?.language || s.language === audio.language),
  );
  return forced?.id ?? null;
}

const trackTitle = (s) => (s.title && s.title.toLowerCase() !== (s.language ?? '').toLowerCase() ? s.title : null);

/**
 * Settings options for a file's own tracks. Choosing one calls `onChange`
 * with the new `{ audioId, subtitleId, quality }`; the caller restarts the
 * stream with it.
 */
export function useServerTrackOptions({ file, version, request, onChange, canDirectPlay }) {
  const { t } = useTranslation();
  const streams = file?.streams ?? [];
  if (!request) return { audio: [], text: [], quality: [] };

  const audio = streams
    .filter((s) => s.kind === 'AUDIO')
    .map((s) => ({
      key: s.id,
      label: languageLabel(s.language),
      detail: [trackTitle(s), s.codec?.toUpperCase(), channelsLabel(s.channels), canDecodeAudio(s.codec) ? null : t('converted')]
        .filter(Boolean)
        .join(' · '),
      selected: s.id === request.audioId,
      onSelect: () => s.id !== request.audioId && onChange({ audioId: s.id }),
    }));

  const text = [
    {
      key: 'off',
      label: t('Off'),
      selected: !request.subtitleId,
      onSelect: () => request.subtitleId && onChange({ subtitleId: null }),
    },
    ...streams
      .filter((s) => s.kind === 'SUBTITLE')
      .map((s) => ({
        key: s.id,
        label: languageLabel(s.language),
        detail: [
          trackTitle(s),
          s.isForced ? t('Forced') : null,
          s.codec?.toUpperCase(),
          isImageSubtitle(s.codec) ? t('burned in (transcode)') : null,
        ]
          .filter(Boolean)
          .join(' · '),
        selected: s.id === request.subtitleId,
        onSelect: () => s.id !== request.subtitleId && onChange({ subtitleId: s.id }),
      })),
  ];

  const sourceBitrate = (version?.bitrate ?? 0) * 1000;
  const quality = [
    {
      key: 'original',
      label: t('Original'),
      detail: canDirectPlay ? t('Direct Play when possible') : t('Video copied, without conversion'),
      selected: request.quality === 'original',
      onSelect: () => request.quality !== 'original' && onChange({ quality: 'original' }),
    },
    {
      key: 'auto',
      label: t('Auto'),
      detail: t('Chosen by the player for the connection'),
      selected: request.quality === 'auto',
      onSelect: () => request.quality !== 'auto' && onChange({ quality: 'auto' }),
    },
    // In automatic quality the stream already holds every quality: the player lists those.
    ...BITRATE_CAPS.filter((cap) => request.quality !== 'auto' && (!sourceBitrate || cap < sourceBitrate)).map((cap) => ({
      key: String(cap),
      label: formatBitrate(cap / 1000),
      detail: t('Transcode'),
      selected: request.quality === cap,
      onSelect: () => request.quality !== cap && onChange({ quality: cap }),
    })),
  ];

  return { audio, text, quality };
}
