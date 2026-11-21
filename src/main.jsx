import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ApolloProvider } from '@apollo/client/react';
import { client } from './apollo/client';
import { redeemTicket } from './apollo/ticket';
import App from './App';
import './i18n';
import './styles/global.css';

// A ticket in the address signs in first, so the app's first question already has its answer.
redeemTicket(client).finally(() =>
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ApolloProvider client={client}>
        <App />
      </ApolloProvider>
    </StrictMode>,
  ),
);
