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
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

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
  const { getToken } = useAuth();
  const { pid } = Route.useSearch();
  const [action, setAction] = useState("Upload");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [selection, setSelection] = useState(selectionList);
  const [commitMessage, setCommitMessage] = useState("");

  async function handleAction() {
    const start = performance.now();
    setDisabled(true);
    // get special JWT for rust/store operations
    const uwu = await getToken({
      template: "store-operations",
      leewayInSeconds: 30,
    });
    let selectedFiles: string[] = [];
    let uploadList: any[] = [];
    for (let i = 0; i < Object.keys(selection).length; i++) {
      const key: number = parseInt(Object.keys(selection)[i]);
      selectedFiles.push(uploads[key].filepath);

      uploadList.push({
        path: uploads[key].filepath,
        hash: uploads[key].hash,
        changetype: uploads[key].change_type,
      });
    }
    console.log(selectedFiles);

    const selectedLength = selectedFiles.length;
    let actionedFiles = 0;
    setStatus(`0 of ${selectedLength} files uploaded...`);
    const unlisten = await listen("fileAction", (event: any) => {
      console.log(event);
      setProgress((100 * ++actionedFiles) / selectedLength);
      let verb = "uploaded";
      if (action == "Reset") {
        verb = "reset";
      }
      setStatus(`${actionedFiles} of ${selectedLength} files ${verb}...`);
    });
    if (action == "Upload") {
      // upload files w/ store/upload or whatever path
      await invoke("upload_files", {
        pid: parseInt(pid),
        filepaths: selectedFiles,
        token: uwu,
      });

      setStatus("Logging project updates...");
      // create commit
      const endpoint = url + "/commit";
      console.log(endpoint);
      const response = await fetch(endpoint, {
        method: "POST",
        mode: "cors",
        headers: { Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({
          projectId: parseInt(pid),
          message: commitMessage,
          files: uploadList,
        }),
      });
      const data = await response.json();
      console.log(data);
      // handle when we don't get a successful response
      if (data.status != "success") {
        unlisten();
        let permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
          const permission = await requestPermission();
          permissionGranted = permission === "granted";
        }

        // Once permission has been granted we can send the notification
        const end = performance.now();

        if (permissionGranted) {
          sendNotification({ title: "glassyPDM", body: `Upload failed` });
        }
        setStatus(`Upoad failed`);
        setDisabled(false);
        return;
      }

      // update db
      await invoke("update_uploaded", {
        pid: parseInt(pid),
        commit: data.commitid,
        files: uploadList,
      });
    } else if (action == "Reset") {
      await invoke("reset_files", {
        pid: parseInt(pid),
        filepaths: selectedFiles,
        token: uwu,
      });
    }

    unlisten();

    let permissionGranted = await isPermissionGranted();

    // If not we need to request it
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }

    // Once permission has been granted we can send the notification
    const end = performance.now();

    if (permissionGranted) {
      sendNotification({
        title: "glassyPDM",
        body: `Finished action in ${(end - start) / 1000} seconds`,
      });
    }

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
            {progress == 100 ? action + " Complete" : action + " Selected"}
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
      />
    </div>
  );
}
