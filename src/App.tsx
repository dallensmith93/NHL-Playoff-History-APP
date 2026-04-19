import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AboutPage } from './features/about/AboutPage';
import { ConnSmythePage } from './features/conn-smythe/ConnSmythePage';
import { ComparePage } from './features/compare/ComparePage';
import { FavoritesPage } from './features/favorites/FavoritesPage';
import { FranchiseDetailPage } from './features/franchises/FranchiseDetailPage';
import { FranchiseIndexPage } from './features/franchises/FranchiseIndexPage';
import { HomePage } from './features/home/HomePage';
import { PlayoffsBracketPage } from './features/playoffs/pages/PlayoffsBracketPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="franchises" element={<FranchiseIndexPage />} />
        <Route path="franchises/:slug" element={<FranchiseDetailPage />} />
        <Route path="conn-smythe" element={<ConnSmythePage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="playoffs/2026-bracket" element={<PlayoffsBracketPage />} />
        <Route path="playoffs/2026" element={<PlayoffsBracketPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
