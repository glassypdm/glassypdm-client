import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { DownloadTable } from "./DownloadTable";
import { columns } from "./DownloadColumns";
import { ChangeType, CADFileColumn } from "@/lib/types";

interface DownloadPageProps extends React.HTMLAttributes<HTMLDivElement> {}

const test: CADFileColumn[] = [
  {
    file: {
      path: "test1.txt",
      change: ChangeType.CREATE,
    },
  },
  {
    file: {
      path: "test2.txt",
      change: ChangeType.UPDATE,
    },
  },
  {
    file: {
      path: "test3.txt",
      change: ChangeType.DELETE,
    },
  },
];
export function DownloadPage({ className }: DownloadPageProps) {
  const navigate = useNavigate();
  // TODO add progress bar
  return (
    <div className={cn("", className)}>
      <h1 className="text-2xl">Download Changes</h1>
      <div className="m-1">
        {/** page header */}
        <Button className="left-0" onClick={() => navigate(-1)}>
          Close
        </Button>
        <Button className="fixed right-10">Download Selected</Button>
      </div>
      <div className="container mx-auto py-10">
        <DownloadTable columns={columns} data={test} />
      </div>
    </div>
  );
}
