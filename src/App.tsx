import { ThemeProvider } from "@/components/theme-provider";
import { Workbench } from "@/components/Workbench"
import '@/App.css';


function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Workbench/>
    </ThemeProvider>
  );
}

export default App;
