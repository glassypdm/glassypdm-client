import { cn } from "@/lib/utils";

interface SettingsProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Settings({ className }: SettingsProps) {
  return (
    <div className={cn("", className)}>
      <h1>client settings page</h1>
    </div>
  );
}
