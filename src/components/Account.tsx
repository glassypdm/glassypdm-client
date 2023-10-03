import { cn } from "@/lib/utils";

interface AccountProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Account({ className }: AccountProps) {
  return (
    <div className={cn("", className)}>
      <p>account page</p>
    </div>
  );
}
