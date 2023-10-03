import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RowSelectionState } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { DownloadTable } from "./DownloadTable";
import { columns } from "./DownloadColumns";
import { ChangeType, CADFileColumn } from "@/lib/types";
import { Progress } from "./ui/progress";

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
export function DownloadPage(props: DownloadPageProps) {
  const [files, setFiles] = useState<CADFileColumn[]>([]);
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // TODO do something better
  // using data API w/ createHashRouter
  // and loaders is likely better
  useEffect(() => {
    let ignore = false;

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className={cn("", props.className)}>
      <h1 className="text-2xl">Download Changes</h1>
      <div className="m-2">
        {/** page header */}
        <Button className="left-0" onClick={() => navigate(-1)}>
          Close
        </Button>
        <Button
          className="fixed right-10"
          disabled={Object.keys(selection).length == 0}
        >
          Download Selected
        </Button>
      </div>
      <Progress className="" value={30} />
      <div className="container mx-auto py-10">
        <DownloadTable
          columns={columns}
          data={test}
          selection={selection}
          setSelection={setSelection}
        />
      </div>
    </div>
  );
}
