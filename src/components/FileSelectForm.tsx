"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useToast } from "@/components/ui/use-toast"
import { ChangeType, LocalCADFile } from "@/lib/types"
import { Progress } from "./ui/progress"
import { resolve, appLocalDataDir, BaseDirectory } from "@tauri-apps/api/path"
import { readTextFile } from "@tauri-apps/api/fs"
import { invoke } from "@tauri-apps/api/tauri"
import { useState } from "react"

export interface FileSelectFormProps {
  files: LocalCADFile[],
  projectDir: string,
  paths: string[]
}

export function FileSelectForm(props: FileSelectFormProps) {
    const { toast } = useToast();
    const [ progress, setProgress ] = useState(0);

    const FormSchema = z.object({
      items: z.array(z.string()).refine(() => true, {
      }),
    })

    // TODO set everything to default
    const form = useForm<z.infer<typeof FormSchema>>({
      resolver: zodResolver(FormSchema),
      defaultValues: {
        items: []
      },
    })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log(data);

    if(data.items.length == 0) {
      console.log("nothing to upload")
      return;
    }

    const serverUrl = await invoke("get_server_url");

    // upload files
    // get LocalCADFile by path
    let uploadList: LocalCADFile[] = []
    for(let i = 0; i < data.items.length; i++) {
      const filePath = data.items[i]; // full path of selected item
      for(let j = 0; j < props.files.length; j++) {
        if(filePath == props.files[i].path) {
          uploadList.push(props.files[i]);
          break;
        }
      }
    }

    // get commit of base
    const commitStr = await readTextFile("basecommit.txt", { dir: BaseDirectory.AppLocalData });
    let newCommit: number = parseInt(commitStr);
    newCommit += 1;
    console.log(uploadList);

    const length: number = uploadList.length;
    for(let i = 0; i < length; i++) {
      console.log(uploadList[i]);
      await invoke("upload_changes", {
        file: {
          path: uploadList[i].path,
          size: uploadList[i].size,
          hash: uploadList[i].hash
        },
        commit: newCommit,
        serverUrl: serverUrl
      });
      setProgress((i + 1) * 100 / length);
    }
    setProgress(0);

    // update base.json
    const appdata = await appLocalDataDir();
    const path = await resolve(appdata, "base.json");
    await invoke("hash_dir", { resultsPath: path });
    // feedback
    toast({
      title: "You uploaded the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="items"
          render={() => (
            <FormItem>
              {props.files.map((item) => (
                <FormField
                  key={item.path}
                  control={form.control}
                  name="items"
                  render={({ field }) => {
                    let text: string = "";
                    let color: string = "";
                    switch(item.change) {
                      case ChangeType.CREATE:
                        color = "text-green-400";
                        text = "new";
                        break;
                      case ChangeType.UPDATE:
                        color = "text-blue-300";
                        text = "updated";
                        break;
                        case ChangeType.DELETE:
                        color = "text-red-400";
                        text = "deleted"
                        break;
                    }
                  
                    return (
                      <FormItem
                        key={item.path}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <div className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.path)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, item.path])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== item.path
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{item.path.replace(props.projectDir, "")}
                        </FormLabel>
                        <FormLabel className={color}>{text}
                        </FormLabel>
                        </div>
                      </FormItem>
                    )
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
        <Progress value={progress}/>
      </form>
    </Form>
  )
}
