import {
  ClerkProvider,
  RedirectToSignIn,
  SignedIn,
  SignedOut,
} from "@clerk/clerk-react";
import { HashRouter, Routes, Route } from "react-router-dom";
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

const clerkPath = await resolveResource("resources/clerk.txt");
const REACT_APP_CLERK_PUBLISHABLE_KEY = await readTextFile(clerkPath);

function App() {
  return (
    <ClerkProvider publishableKey={REACT_APP_CLERK_PUBLISHABLE_KEY}>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <HashRouter basename="/">
            <div className="grid grid-cols-4 grid-flow-row gap-4 h-full">
              <Sidebar className="row-span-1" />
              <Routes>
                <Route
                  path="/"
                  element={<Workbench className="col-span-3" />}
                />
                <Route
                  path="/history"
                  element={<History className="col-span-3" />}
                />
                <Route
                  path="/settings"
                  element={<Settings className="col-span-3" />}
                />
                <Route
                  path="/account"
                  element={<Account className="col-span-3" />}
                />
                <Route
                  path="/about"
                  element={<About className="col-span-3" />}
                />
              </Routes>
            </div>
          </HashRouter>
        </ThemeProvider>
      </SignedIn>
    </ClerkProvider>
  );
}

export default App;
