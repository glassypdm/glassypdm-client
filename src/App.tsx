import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import { Button } from "./Button";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("hehe");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke("greet", { name }));
  }

  async function directory() {
    console.log("click directory");
    await invoke("get_changes", { resultsPath: "..\\compare.json" });
  }


  return (
    <div className="container">
      <Button onPress={() => alert('button')}>Press</Button>
    </div>
  );
}

export default App;
