import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Workbench } from "@/components/Workbench"
import { Sidebar } from "./components/Sidebar";
import '@/App.css';
import { Settings } from "./components/Settings";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="grid grid-cols-4 grid-flow-row gap-4 h-full">
      <Sidebar className="row-span-1"/>
      <HashRouter basename="/">
        <Routes>
          <Route path="/" element={<Workbench className="col-span-3"/>}>
          </Route>
          <Route path="/settings" element={<Settings className="col-span-3"/>}/>
        </Routes>
      </HashRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;
