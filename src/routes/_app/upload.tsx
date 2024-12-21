import { columns, File } from "@/components/file/FileColumn";
import { FileTable } from "@/components/file/FileTable";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useAuth } from "@clerk/clerk-react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { RowSelectionState } from "@tanstack/react-table";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/upload")({
  validateSearch: (search) =>
    search as {
      pid: string;
    },
  loaderDeps: ({ search: { pid } }) => ({
    pid,
  }),
  loader: async ({ deps: { pid } }) => {
    let pid_i32 = parseInt(pid);
    const url: string = await invoke("get_server_url");
    const uploads: File[] = await invoke("get_uploads", { pid: pid_i32 });

    // initialize selection list
    let selectionList: RowSelectionState = {};
    for (let i = 0; i < uploads.length; i++) {
      selectionList[i.toString()] = true;
    }
    const projectName: string = await invoke("get_project_name", {
      pid: pid_i32,
    });
    return { uploads, selectionList, projectName, url };
  },
  component: () => <UploadPage />,
  gcTime: 0, // do not cache this route's data after its unloaded per docs
  shouldReload: false, // only reload the route when dependencies change or user navigates to it (per docs)
});

function UploadPage() {
  const { uploads, selectionList, projectName, url } = Route.useLoaderData();
  const { getToken, userId } = useAuth();
  const { pid } = Route.useSearch();
  const [action, setAction] = useState("Upload");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [selection, setSelection] = useState(selectionList);
  const [filter, setFilter] = useState([]);
  const [commitMessage, setCommitMessage] = useState("");
  const { toast } = useToast();

  if (userId == null) {
    return <div>Loading...</div>;
  }

  async function handleAction() {
    const start = performance.now();
    setDisabled(true);
    // TODO unused
    // get special JWT for rust/store operations
    const uwu = await getToken({
      template: "store-operations",
      skipCache: true,
    });

    let selectedFiles: string[] = [];
    let uploadList: any[] = [];
    const filterActive = filter.length > 0;
    for (let i = 0; i < Object.keys(selection).length; i++) {
      const key: number = parseInt(Object.keys(selection)[i]);
      // TODO type is wonky
      if(filterActive && !uploads[key].filepath.includes((filter[0] as any).value)) {
        continue;
      }

      selectedFiles.push(uploads[key].filepath);
      uploadList.push({
        path: uploads[key].filepath,
        hash: uploads[key].hash,
        changetype: uploads[key].change_type,
      });
    }
    console.log(selectedFiles);
    console.log(filter)

    const selectedLength = selectedFiles.length;
    let actionedFiles = 0;
    let verb = "uploaded";
    if (action == "Reset") {
      verb = "reset";
    }
    setStatus(`0 of ${selectedLength} files ${verb}...`);
    const unlisten = await listen("fileAction", (event: any) => {
      console.log(event);
      setProgress(100 * (++actionedFiles) / selectedLength);
      setStatus(`${actionedFiles} of ${selectedLength} files ${verb}...`);
    });
    if (action == "Upload") {

      // upload files (as chunks)
      let res: any = await invoke("upload_files", {
        pid: parseInt(pid),
        filepaths: selectedFiles,
        user: userId,
      });
      if (!res.success) {
        console.log(res)
        if(res.error == "ErrInvalidFile") { // TODO specta or enum
          toast({
            title: "Upload failed",
            description:
              "A file was detected to be different from its synced state. Re-sync and try uploading again.",
          });
        }
        else {
          toast({
            title: "Upload failed",
            description:
              "Check your permissions and Internet connection, and try again.",
          });
        }

        setStatus("Upload failed");
        unlisten();
        setDisabled(false);
        return;
      }

      const ENDPOINT = url + "/commit";
      const UPLOAD_LIMIT = 200;
      setStatus(
        `Logging project update${uploadList.length > UPLOAD_LIMIT ? "s" : ""}...`
      );

      // commit 200 files at a time
      for (let i = 0; i < uploadList.length; i += UPLOAD_LIMIT) {
        // append to commit message if needed
        let msg = commitMessage;
        if (uploadList.length >= UPLOAD_LIMIT) {
          msg += ` - Part ${i / UPLOAD_LIMIT + 1}`;
        }

        // create commit
        const response = await fetch(ENDPOINT, {
          method: "POST",
          mode: "cors",
          headers: { Authorization: `Bearer ${await getToken()}` },
          body: JSON.stringify({
            projectId: parseInt(pid),
            message: msg,
            files: uploadList.slice(i, i + UPLOAD_LIMIT),
          }),
        });
        const data = await response.json();
        console.log(data);
        if (data.response != "success") {
          unlisten();

          setStatus(`Upload failed`);
          setDisabled(false);
          return;
        }

        // update db
        await invoke("update_uploaded", {
          pid: parseInt(pid),
          commit: data.body.commit_id,
          files: uploadList.slice(i, i + UPLOAD_LIMIT),
        });
      }
    } else if (action == "Reset") {
      let result = await invoke("reset_files", {
        pid: parseInt(pid),
        filepaths: selectedFiles,
        user: userId,
      });
      if (result) {
      } else {
        unlisten();
        toast({
          title: "Reset failed",
          description: "Try again soon"
        });
        setStatus(`${action} failed`);
        setDisabled(false);
        return;
      }
      setProgress(100);
    }

    unlisten();

    // Once permission has been granted we can send the notification
    const end = performance.now();
    toast({
      title: `${action} took ${(end - start)/1000} seconds`,
    });

    setStatus(`${action} complete!`);
    setDisabled(false);
  }

  return (
    <div className="flex flex-col p-4">
      <h1 className="text-3xl pb-8">Upload Changes to {projectName}</h1>
      <div className="flex flex-row justify-items-center items-center">
        <Link
          to={"/projects/$pid/sync"}
          params={{ pid: pid }}
          disabled={disabled}
        >
          <Button
            className="flex-none disabled:pointer-events-none disabled:opacity-50"
            disabled={disabled}
          >
            Close
          </Button>
        </Link>
        <p className="flex-auto text-center">{status}</p>
        <div className="flex">
          <Button
            disabled={
              Object.keys(selection).length == 0 || disabled || progress == 100
            }
            onClick={handleAction}
            variant={action == "Reset" ? "destructive" : "default"}
          >
            {progress == 100 && !disabled ? action + " Complete" : progress == 0 ? action + " Selected" : <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Please wait</>}
          </Button>
          <Select onValueChange={(e) => setAction(e)}>
            <SelectTrigger
              className="w-[40px]"
              disabled={disabled || progress == 100}
            ></SelectTrigger>
            <SelectContent>
              <SelectItem value="Upload">Upload</SelectItem>
              <SelectItem value="Reset">Reset</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="py-4 space-y-2">
        <Textarea
          placeholder="Write your project update message here."
          disabled={disabled || progress == 100}
          onChange={(e) => setCommitMessage(e.target.value)}
        />
        <Progress value={progress} />
      </div>
      <FileTable
        columns={columns}
        data={uploads}
        selection={selection}
        setSelection={setSelection}
        includeFilter={true}
        height='h-[41vh]'
        filter={filter}
        setFilter={setFilter}
      />
    </div>
  );
}
