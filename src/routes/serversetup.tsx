import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form";
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export const Route = createFileRoute('/serversetup')({
    component: ServerSetup,
})

const formSchema = z.object({
    serverURL: z.string().url({ message: "Invalid url." })
})

function ServerSetup() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            serverURL: "",
          },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values)

        // fetch data from server/daijin-config
        // if its valid, 
      }


  return (
    <div>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                    control={form.control}
                    name="serverURL"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>ServerURL</FormLabel>
                            <FormControl>
                                <Input  {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit">Submit</Button>
            </form>
        </Form>
    </div>
  )
}

export default ServerSetup