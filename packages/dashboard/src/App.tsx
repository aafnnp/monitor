/**
 * App 主组件
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from './pages/Login';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Settings } from './pages/Settings';
import { Layout } from './components/layout/Layout';
import { getAuthToken } from './lib/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

/**
 * 私有路由组件
 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = getAuthToken();
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

/**
 * App 根组件
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Projects />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <PrivateRoute>
                <ProjectDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
