
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60, // 1 hour
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 0, // Don't retry failed queries
      refetchOnWindowFocus: false,
      refetchOnMount: true
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

