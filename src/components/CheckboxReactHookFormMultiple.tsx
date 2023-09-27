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

// TODO move ChangeType, LocalCADFile into some types.tsx thing
enum ChangeType {
  CREATE,
  UPDATE,
  DELETE,
  UNIDENTIFIED
}

const items = [
  {
    path: "\\kanguwu.txt",
    status: ChangeType.UPDATE,
  },
  {
    path: "home",
    status: ChangeType.DELETE,
  },
  {
    path: "applications",
    status: ChangeType.UPDATE,
  },
  {
    path: "desktop",
    status: ChangeType.CREATE,
  },
  {
    path: "downloads",
    status: ChangeType.UPDATE,
  },
  {
    path: "documents",
    status: ChangeType.CREATE,
  },
]

const FormSchema = z.object({
  items: z.array(z.string()).refine((value) => true, {
  }),
})

export function CheckboxReactHookFormMultiple() {
    const { toast } = useToast();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      items: [],
    },
  })

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log(data)
    toast({
      title: "You submitted the following values:",
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
              <div className="mb-4">
                <FormLabel className="text-base">Sidebar</FormLabel>
                <FormDescription>
                  Select the items you want to display in the sidebar.
                </FormDescription>
              </div>
              {items.map((item) => (
                <FormField
                  key={item.path}
                  control={form.control}
                  name="items"
                  render={({ field }) => {
                    let text: string = "";
                    let color: string = "";
                    switch(item.status) {
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
                        <FormLabel className="font-normal">{item.path}
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
      </form>
    </Form>
  )
}
