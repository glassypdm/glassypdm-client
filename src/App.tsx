import { ClerkProvider } from "@clerk/clerk-react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Workbench } from "@/components/Workbench";
import { Sidebar } from "./components/Sidebar";
import "@/App.css";
import { Settings } from "./components/Settings";
import { Account } from "./components/Account";

const REACT_APP_CLERK_PUBLISHABLE_KEY = "";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <HashRouter basename="/">
        <div className="grid grid-cols-4 grid-flow-row gap-4 h-full">
          <Sidebar className="row-span-1" />
          <Routes>
            <Route path="/" element={<Workbench className="col-span-3" />} />
            <Route
              path="/settings"
              element={<Settings className="col-span-3" />}
            />
            <Route
              path="/account"
              element={<Account className="col-span-3" />}
            />
          </Routes>
        </div>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
