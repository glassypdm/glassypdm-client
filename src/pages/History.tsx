import { HistoryLoaderProps, Commit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLoaderData } from "react-router-dom";
import { Separator } from "../components/ui/separator";

interface HistoryProps extends React.HTMLAttributes<HTMLDivElement> {}

export function History({ className }: HistoryProps) {
  const loaderData: HistoryLoaderProps = useLoaderData() as HistoryLoaderProps;

  return (
    <div className={cn("", className)}>
      <h1 className="text-2xl">Project History</h1>
      <Separator />
      <ul>
        {loaderData.recentCommits.map(
          (val: Commit, index: number, array: Commit[]) => {
            index;
            array;
            const d = new Date(0);
            d.setUTCSeconds(val.timestamp);
            const msg =
              val.message !== "" ? (
                <p>
                  with message <i>{val.message}</i>
                </p>
              ) : (
                <p></p>
              );
            return (
              <div key={val.id}>
                <li key={val.id}>
                  Commit {val.id} by {val.authorID} changed {val.fileCount}{" "}
                  files at {d.toLocaleString()}
                  {msg}
                </li>
                <Separator />
              </div>
            );
          },
        )}
      </ul>
    </div>
  );
}
