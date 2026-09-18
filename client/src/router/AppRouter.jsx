import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ROUTES } from './routes';
import Layout from '../shared/components/Layout';

function LoadingFallback() {
  return (
    <div className="loading-fallback">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  );
}

function AppRouter() {
  return (
    <Layout>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {ROUTES.map(({ path, element: PageComponent }) => (
            <Route key={path} path={path} element={<PageComponent />} />
          ))}
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default AppRouter;
