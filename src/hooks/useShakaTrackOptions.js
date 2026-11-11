import { useTranslation } from 'react-i18next';
import { channelsLabel, formatBitrate, languageLabel } from '../utils/format';

/**
 * Settings options built from the tracks Shaka found in the manifest — for
 * test streams, whose manifest carries every language and quality.
 */
export function useShakaTrackOptions(shakaState) {
  const { t } = useTranslation();
  const { tracks, abr, activeQuality } = shakaState;
  const activeText = tracks.text.find((tr) => tr.active);

  const audio = tracks.audio.map((track, i) => ({
    key: track.key ?? String(i),
    label: track.label || languageLabel(track.language),
    detail: [track.label ? languageLabel(track.language) : null, channelsLabel(track.channelsCount)].filter(Boolean).join(' · '),
    selected: track.active,
    onSelect: () => shakaState.selectAudio(track),
  }));

  const text = [
    { key: 'off', label: t('Off'), selected: !activeText, onSelect: () => shakaState.selectText(null) },
    ...tracks.text.map((track) => ({
      key: String(track.id),
      label: languageLabel(track.language),
      detail: [track.label && track.label !== track.language ? track.label : null, track.forced ? t('Forced') : null]
        .filter(Boolean)
        .join(' · '),
      selected: track.active,
      onSelect: () => shakaState.selectText(track),
    })),
  ];

  const quality = [
    {
      key: 'auto',
      label: t('Auto'),
      detail: activeQuality ? t('Currently {{quality}}', { quality: activeQuality }) : null,
      selected: abr,
      onSelect: () => shakaState.selectQuality(null),
    },
    ...tracks.video.map((track) => ({
      key: track.quality,
      label: track.quality,
      detail: [track.width && track.height ? `${track.width}×${track.height}` : null, formatBitrate(Math.round((track.bandwidth ?? 0) / 1000))]
        .filter(Boolean)
        .join(' · '),
      selected: !abr && track.quality === activeQuality,
      onSelect: () => shakaState.selectQuality(track),
    })),
  ];

  return { audio, text, quality };
}
