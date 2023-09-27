import { ThemeProvider } from "@/components/theme-provider";
import { Workbench } from "@/components/Workbench"
import { Sidebar } from "./components/Sidebar";
import '@/App.css';


function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="grid grid-cols-4 grid-flow-row gap-4 h-full">
      <Sidebar className="row-span-1"/>
      <Workbench className="col-span-3"/>
      </div>
    </ThemeProvider>
  );
}

export default App;
