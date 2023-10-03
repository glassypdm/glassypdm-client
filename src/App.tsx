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
import { Workbench } from "@/components/Workbench";
import { Sidebar } from "./components/Sidebar";
import "@/App.css";
import { Settings } from "./components/Settings";
import { Account } from "./components/Account";
import { History } from "./components/History";
import { About } from "./components/About";
import { DownloadPage } from "./components/DownloadPage";
import { downloadPageLoader } from "./components/DownloadColumns";

const clerkPath = await resolveResource("resources/clerk.txt");
const REACT_APP_CLERK_PUBLISHABLE_KEY = await readTextFile(clerkPath);

const router = createHashRouter([
  {
    path: "",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <Workbench className="col-span-3" />,
      },
      {
        path: "/history",
        element: <History className="col-span-3" />,
      },
      {
        path: "/settings",
        element: <Settings className="col-span-3" />,
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
        element: <DownloadPage className="col-span-3" />,
        loader: downloadPageLoader,
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
