import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form";
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import { Loader2 } from "lucide-react"

export const Route = createFileRoute('/serversetup')({
    component: ServerSetup,
})

const formSchema = z.object({
    serverURL: z.string().url({ message: "Invalid url." }).startsWith("http", { message: "Invalid url." })
})

function ServerSetup() {
    const [submitStatus, setSubmitStatus] = useState(false);
    const [submitText, setSubmitText] = useState(<p>Submit</p>);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            serverURL: "",
          },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values)
        setSubmitStatus(true);
        setSubmitText(<Loader2 className="h-4 w-4 animate-spin" />);

        // fetch data from server/daijin-config
        const data = await fetch(values.serverURL + "/daijin-config")
        // FIXME cors
        console.log(data)
        setSubmitStatus(false);
        setSubmitText(<p>Submit</p>)
        // if its valid, store server url (and clerk key?)
        // and redirect to login/register
      }


  return (
    <div className="flex flex-col place-items-center">
        <h1 className="text-4xl my-12">daijinCAD</h1>
        <h2 className="text-2xl">Set the Server URL</h2>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-3/4 my-12 space-y-4">
                <FormField
                    control={form.control}
                    name="serverURL"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xl">Server URL</FormLabel>
                            <FormControl>
                                <Input  {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" disabled={submitStatus}>{submitText}</Button>
            </form>
        </Form>
    </div>
  )
}

export default ServerSetup