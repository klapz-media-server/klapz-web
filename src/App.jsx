import { createBrowserRouter, RouterProvider } from 'react-router';
import Layout from './components/Layout/Layout';
import SessionGate from './components/SessionGate/SessionGate';
import AdminPage from './pages/AdminPage/AdminPage';
import AuthPage from './pages/AuthPage/AuthPage';
import HomePage from './pages/HomePage/HomePage';
import LibraryPage from './pages/LibraryPage/LibraryPage';
import MoviePage from './pages/MoviePage/MoviePage';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';
import PlayerPage from './pages/PlayerPage/PlayerPage';
import SearchPage from './pages/SearchPage/SearchPage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import ShowPage from './pages/ShowPage/ShowPage';

const router = createBrowserRouter([
  // Full-screen, outside the layout (no top bar). Item URLs are /<kind>/<id>/<slug>;
  // the slug-less forms are older links, rewritten once the item is loaded.
  { path: 'play/:id/:slug', element: <SessionGate><PlayerPage /></SessionGate> },
  { path: 'play/:id', element: <SessionGate><PlayerPage /></SessionGate> },
  // Keyed: switching between the two must not carry one form's state into the other.
  { path: 'sign-in', element: <AuthPage key="sign-in" mode="sign-in" /> },
  { path: 'sign-up', element: <AuthPage key="sign-up" mode="sign-up" /> },
  {
    element: (
      <SessionGate>
        <Layout />
      </SessionGate>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'library/:id', element: <LibraryPage /> },
      { path: 'movie/:id/:slug', element: <MoviePage /> },
      { path: 'movie/:id', element: <MoviePage /> },
      { path: 'show/:id/:slug', element: <ShowPage /> },
      { path: 'show/:id/:slug/:seasonId/:seasonSlug', element: <ShowPage /> },
      { path: 'show/:id', element: <ShowPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/:section', element: <SettingsPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
