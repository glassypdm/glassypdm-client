import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form";
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import { Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { join, sep } from "@tauri-apps/api/path";
import { mkdir, exists } from "@tauri-apps/plugin-fs"; 
import { invoke } from "@tauri-apps/api/core";

export const Route = createFileRoute('/serversetup')({
    component: ServerSetup,
})

const formSchema = z.object({
    serverURL: z.string().url({ message: "Invalid url." }).startsWith("http", { message: "Invalid url." })
})

function ServerSetup() {
    const [submitStatus, setSubmitStatus] = useState(false);
    const [submitText, setSubmitText] = useState(<p>Submit</p>);
    const [serverFolderText, setServerFolderText] = useState(<p className="text-destructive">glassyPDM server folder location not set.</p>);
    const [serverFolder, setServerFolder] = useState(""); // TODO the above is not necessary
    const navigate = useNavigate();
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            serverURL: "",
          },
    })

    async function setFolder() {
        const folder = await open({
            multiple: false,
            directory: true,
        });

        if(folder) {
            setServerFolderText(<p>{folder}<span className="text-gray-400">{sep()}glassyPDM</span></p>);
            setServerFolder(await join(folder, "glassyPDM"));
        }
        else if (!folder && serverFolder == ""){
            toast("No folder selected")
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setSubmitStatus(true);
        setSubmitText(<Loader2 className="h-4 w-4 animate-spin" />);

        if(serverFolder == "") {
            // server folder not set
            toast("Please select a folder.");
            setSubmitText(<p>Submit</p>)
            setSubmitStatus(false);
            console.log("no  folder");

            return;
        }

        // make folder, but check if it exists first
        const folderExists: boolean = await exists(serverFolder);
        if(folderExists) {
            // server folder not set
            toast("glassyPDM folder already exists; please select a different location.");
            setSubmitText(<p>Submit</p>)
            setSubmitStatus(false);
            console.log("already exists");
            return;
        }
        else {
            await mkdir(serverFolder);
        }

        // TODO error handling; if response isnt what we expected
        const data = await (await fetch(values.serverURL + "/client-config")).json();
        console.log(data)
        setSubmitStatus(false);
        setSubmitText(<p>Submit</p>)


        await invoke("add_server", {
            url: values.serverURL,
            clerk: data.clerk_publickey,
            localDir: serverFolder,
            name: data.name
        });
        console.log("hehehe")
        navigate({ to: "/signin" })
    }

  return (
    <div className="flex flex-col place-items-center">
        <h1 className="text-4xl my-12">glassyPDM</h1>
        <h2 className="text-2xl">First Time Setup</h2>
        <TooltipProvider>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col w-3/4 my-12 space-y-4">
                <FormField
                    control={form.control}
                    name="serverURL"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-md">Server URL</FormLabel>
                            <FormControl>
                                <Input  {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Tooltip>
                        <TooltipTrigger asChild className="flex flex-row items-center space-x-4 mb-16">
                        <div className="">
                            <Button onClick={setFolder} variant={"outline"} type="button">Set Server Folder Location</Button>
                            <Label>{serverFolderText}</Label>
                        </div>
                        </TooltipTrigger>
                        <TooltipContent>The folder where the glassyPDM server folder will be created. This is where files will be synced to.</TooltipContent>
                    </Tooltip>
                    <Button type="submit" disabled={submitStatus} className="w-20">{submitText}</Button>
            </form>
        </Form>
        </TooltipProvider>
    </div>
  )
}

export default ServerSetup