import {
  ClerkProvider,
  RedirectToSignIn,
  SignedIn,
  SignedOut,
} from "@clerk/clerk-react";
import { createHashRouter, Outlet, RouterProvider } from "react-router-dom";
import { resolveResource } from "@tauri-apps/api/path";
import { readTextFile } from "@tauri-apps/api/fs";
import { ThemeProvider } from "@/components/theme-provider";
import { Workbench } from "@/pages/Workbench";
import { Sidebar } from "./components/Sidebar";
import "@/App.css";
import { Settings } from "./pages/Settings";
import { Account } from "./pages/Account";
import { History } from "./pages/History";
import { About } from "./pages/About";
import { DownloadPage } from "./pages/DownloadPage";
import { downloadPageLoader, uploadPageLoader } from "./components/FileColumn";
import { UploadPage } from "./pages/UploadPage";
import { settingsLoader } from "./lib/SettingsLoader";
import { workbenchLoader } from "./lib/WorkbenchLoader";
import { Toaster } from "./components/ui/toaster";
import { historyLoader } from "./lib/HistoryLoader";

const clerkPath = await resolveResource("resources/clerk.txt");
const REACT_APP_CLERK_PUBLISHABLE_KEY = await readTextFile(clerkPath);

const router = createHashRouter([
  {
    path: "",
    element: <Layout />,
    children: [
      {
        path: "*",
        element: <Workbench className="col-span-3" />,
        loader: workbenchLoader,
      },
      {
        path: "/",
        element: <Workbench className="col-span-3" />,
        loader: workbenchLoader,
      },
      {
        path: "/history",
        element: <History className="col-span-3" />,
        loader: historyLoader,
      },
      {
        path: "/settings",
        element: <Settings className="col-span-3" />,
        loader: settingsLoader,
      },
      {
        path: "/account",
        element: <Account className="col-span-3" />,
      },
      {
        path: "/about",
        element: <About className="col-span-3" />,
      },
      {
        path: "/download",
        element: (
          <DownloadPage className="absolute col-span-4 z-10 bg-slate-950" />
        ),
        loader: downloadPageLoader,
      },
      {
        path: "/upload",
        element: <UploadPage className="col-span-3" />,
        loader: uploadPageLoader,
      },
    ],
  },
]);

export default function App() {
  return (
    <ClerkProvider publishableKey={REACT_APP_CLERK_PUBLISHABLE_KEY}>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <RouterProvider router={router} />
          <Toaster />
        </ThemeProvider>
      </SignedIn>
    </ClerkProvider>
  );
}

function Layout() {
  return (
    <div className="grid grid-cols-4 grid-flow-row gap-4 h-full">
      <Sidebar className="row-span-1" />
      <Outlet />
    </div>
  );
}
