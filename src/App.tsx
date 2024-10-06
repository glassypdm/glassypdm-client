import "./App.css";
import { ThemeProvider } from "./components/theme-provider";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { routeTree } from "./routeTree.gen";
import { Toaster } from "./components/ui/sonner";

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  context: {
    QueryClient,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return (
    <div>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
