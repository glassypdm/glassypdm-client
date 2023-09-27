import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PendingFile } from "./PendingFile"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "./ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "./ui/label"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form" 
import { Checkbox } from "./ui/checkbox"
import { CheckboxReactHookFormMultiple } from "./CheckboxReactHookFormMultiple"

const formSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item)),
});

enum ChangeType {
    CREATE,
    UPDATE,
    DELETE,
    UNIDENTIFIED
  }

// TODO remove
const tags = Array.from({ length: 50 }).map(
    (_, i, a) => `v1.2.0-beta.${a.length - i}`
);

export function LocalChanges() {

    const [allChecked, setAllChecked] = useState(true);
    const [isCheck, setIsCheck] = useState([]);

    function onCheckAll(event: any) {
        setAllChecked(!allChecked)
        console.log(event.target.value)
        if(event.target.value == "on") {
            event.target.value = "off"
        }
        else {
            event.target.value = "on"
        }
    }

    function onCheck(event: any) {
        console.log(event)
    }


    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        items: [],
      },
    })
   
    // 2. Define a submit handler.
    function onSubmit(values: z.infer<typeof formSchema>) {
      // Do something with the form values.
      console.log(values)
    }

    // TODO: probably need to yarn shadcn add form so we get name/value pairs
    // or look at gridlist in react aria
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={"default"}>Files ready to upload</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
            </DialogDescription>
            <div className="flex items-center space-x-2">
            </div>
        </DialogHeader>
          <CheckboxReactHookFormMultiple />
        <DialogFooter>
            <Progress value={0}/>
            <Button type="submit">Upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
