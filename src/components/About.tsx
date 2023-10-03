import { getVersion, getTauriVersion } from "@tauri-apps/api/app";
import { cn } from "@/lib/utils";

interface AboutProps extends React.HTMLAttributes<HTMLDivElement> {}

const GLASSYPDM_VER = await getVersion();
const TAURI_VER = await getTauriVersion();

export function About({ className }: AboutProps) {
  return (
    <div className={cn("", className)}>
      <h1 className="text-2xl">glassyPDM</h1>
      <p>Version: {GLASSYPDM_VER}</p>
      <p>Tauri Version: {TAURI_VER}</p>
      <br />
      <p>
        glassyPDM Client GitHub repository:{" "}
        <a
          className="underline"
          href="https://github.com/joshtenorio/glassypdm-client"
          target="_blank"
        >
          Link
        </a>
      </p>
      <br />
      <p>
        The glassyPDM client is released under the GNU General Public License
        (GPL) version 3 or later version.
      </p>
    </div>
  );
}
