import { SIGN_IN_WITH_TICKET } from '../graphql/mutations';

/**
 * The address with its `ticket` parameter taken out, and the ticket, or null when it carries
 * none. The server's tray icon opens the app at `/web/…?ticket=…`.
 */
export function takeTicket(href) {
  const url = new URL(href);
  const ticket = url.searchParams.get('ticket');
  if (!ticket) return { ticket: null, rest: null };
  url.searchParams.delete('ticket');
  return { ticket, rest: `${url.pathname}${url.search}${url.hash}` };
}

/**
 * Signs the browser in with the one-time ticket the address carries, before the app first
 * asks who is signed in. The ticket is taken out of the address first, so it stays in
 * neither the history nor a shared link; the session is then the usual cookie. A ticket
 * already used or expired just leaves whoever was signed in, or the sign-in page.
 */
export async function redeemTicket(client) {
  const { ticket, rest } = takeTicket(window.location.href);
  if (!ticket) return;
  window.history.replaceState(window.history.state, '', rest);
  try {
    await client.mutate({ mutation: SIGN_IN_WITH_TICKET, variables: { input: { ticket } } });
  } catch {
    // Shown as signed out, or as the server being unreachable, like any other load.
  }
}
