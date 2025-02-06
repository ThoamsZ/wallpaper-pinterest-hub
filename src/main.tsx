
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      cacheTime: 1000 * 60 * 30, // 30 minutes
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
