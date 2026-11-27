import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InMemoryCache } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing/react';
import '../../i18n';
import { UPDATE_SERVER_SETTINGS } from '../../graphql/mutations';
import { SERVER_SETTINGS } from '../../graphql/queries';
import ServerSettingsSection from './ServerSettingsSection';
import { integerValue } from './settingText';

afterEach(cleanup);

const crf = {
  __typename: 'ServerSetting',
  key: 'transcoder.h264.crf',
  description: 'The constant rate factor x264 aims for.',
  kind: 'INTEGER',
  perLibrary: false,
  value: '',
  defaultValue: '',
  isDefault: true,
  optional: true,
  choices: [],
  minimum: '0',
  maximum: '51',
  updatedAt: null,
  updatedBy: null,
};

const listed = {
  request: { query: SERVER_SETTINGS, variables: { namespace: 'transcoder' } },
  result: { data: { server: { __typename: 'Server', id: 'server', settings: { __typename: 'ServerSettingConnection', nodes: [crf] } } } },
};

function saved(value) {
  return {
    request: { query: UPDATE_SERVER_SETTINGS, variables: { input: { settings: [{ key: crf.key, value }] } } },
    result: {
      data: {
        updateServerSettings: {
          __typename: 'UpdateServerSettingsPayload',
          settings: [{ ...crf, value, isDefault: false, updatedAt: '2026-11-28T10:00:00Z' }],
          userErrors: [],
        },
      },
    },
  };
}

async function crfField(mocks) {
  render(
    // A setting is named by its key, as in the app's cache, so a change's answer replaces it.
    <MockedProvider mocks={[listed, ...mocks]} cache={new InMemoryCache({ typePolicies: { ServerSetting: { keyFields: ['key'] } } })}>
      <ServerSettingsSection namespace="transcoder" />
    </MockedProvider>,
  );
  return screen.findByLabelText('H.264 quality (CRF)');
}

describe('integerValue', () => {
  it('reads a whole number within bounds in canonical form', () => {
    expect(integerValue(crf, ' 028 ')).toBe('28');
    expect(integerValue(crf, '0')).toBe('0');
    expect(integerValue(crf, '51')).toBe('51');
  });

  it('takes empty for none only when the setting is optional', () => {
    expect(integerValue(crf, '  ')).toBe('');
    expect(integerValue({ ...crf, optional: false }, '')).toBeUndefined();
  });

  it('refuses what is not a whole number within bounds', () => {
    for (const text of ['52', '-1', '2.5', 'abc', '1e1']) expect(integerValue(crf, text)).toBeUndefined();
  });
});

describe('ServerSettingsSection', () => {
  it('shows an empty optional integer as automatic', async () => {
    const field = await crfField([]);
    expect(field.value).toBe('');
    expect(field.placeholder).toBe('Automatic');
  });

  it('saves a number in canonical form', async () => {
    const field = await crfField([saved('28')]);
    fireEvent.change(field, { target: { value: ' 028 ' } });
    fireEvent.blur(field);
    expect(await screen.findByRole('button', { name: /Clear/ })).toBeTruthy();
    expect(field.value).toBe('28');
  });

  it('goes back to automatic when emptied', async () => {
    const reset = {
      request: { query: UPDATE_SERVER_SETTINGS, variables: { input: { settings: [{ key: crf.key, value: null }] } } },
      result: {
        data: { updateServerSettings: { __typename: 'UpdateServerSettingsPayload', settings: [crf], userErrors: [] } },
      },
    };
    const field = await crfField([saved('28'), reset]);
    fireEvent.change(field, { target: { value: '28' } });
    fireEvent.blur(field);
    await screen.findByRole('button', { name: /Clear/ });
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.blur(field);
    await screen.findByText('Default value');
    expect(screen.queryByRole('button', { name: /Clear/ })).toBeNull();
  });

  it('refuses an out-of-range value without sending it', async () => {
    const field = await crfField([]);
    fireEvent.change(field, { target: { value: '60' } });
    fireEvent.blur(field);
    // The refusal shows under the field, in place of its hint.
    await screen.findByText('Enter a whole number from 0 to 51, or leave it empty.');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.blur(field);
    await waitFor(() => expect(field.getAttribute('aria-invalid')).toBeNull());
    expect(screen.getByText('From 0 to 51')).toBeTruthy();
  });
});
