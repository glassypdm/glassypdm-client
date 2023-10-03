import { cn } from "@/lib/utils";

interface HistoryProps extends React.HTMLAttributes<HTMLDivElement> {}

export function History({ className }: HistoryProps) {
  return (
    <div className={cn("", className)}>
      <h1>project history page</h1>
    </div>
  );
}
