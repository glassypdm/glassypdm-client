import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { RowSelectionState } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { DownloadTable } from "./DownloadTable";
import { DownloadLoaderProps, columns } from "./DownloadColumns";
import { Progress } from "./ui/progress";

interface DownloadPageProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DownloadPage(props: DownloadPageProps) {
  const files: DownloadLoaderProps = useLoaderData() as DownloadLoaderProps;
  const [selection, setSelection] = useState<RowSelectionState>(
    files.selectionList,
  );
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  async function handleDownload() {
    console.log("downloading files");
  }

  return (
    <div className={cn("", props.className)}>
      <h1 className="text-2xl">Download Changes</h1>
      <div className="m-2">
        {/** page header */}
        <Button className="left-0" onClick={() => navigate(-1)}>
          Close
        </Button>
        <Button
          className="absolute right-10"
          onClick={handleDownload}
          disabled={Object.keys(selection).length == 0 || progress == 100}
        >
          Download Selected
        </Button>
      </div>
      <Progress className="" value={0} />
      <div className="container mx-auto py-10">
        <DownloadTable
          columns={columns}
          data={files.files}
          selection={selection}
          setSelection={setSelection}
        />
      </div>
    </div>
  );
}
