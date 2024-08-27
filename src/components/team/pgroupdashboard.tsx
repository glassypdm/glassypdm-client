import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { Input } from "../ui/input"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@clerk/clerk-react"
import { useState } from "react"
import { useToast } from "../ui/use-toast"

const createPGFormSchema = z.object({
    pgroupName: z.string().regex(new RegExp('^[a-zA-Z0-9 -]+$')).trim()
})

interface PermissionGroupDashboardProps {
    teamId: number
    serverUrl: string
}

function PermissionGroupDashboard(props: PermissionGroupDashboardProps) {
    const {getToken} = useAuth();
    const [submitting, setSubmitting] = useState(false)
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const mutationCreatePG = useMutation({
        mutationFn: async (pgName: string) => {
            const endpoint = props.serverUrl + "/team/by-id/" + props.teamId as string + "/pgroup/create";
            const body = {
                team_id: props.teamId,
                pgroup_name: pgName
            }
            return await fetch(endpoint, {
                headers: { Authorization: `Bearer ${await getToken()}`},
                method: "POST",
                body: JSON.stringify(body),
                mode: "cors"
            })
        },
        onError: (err) => {
            console.log(err)
            toast({
                title: "Couldn't contact server",
                description: "Try again later."
            })
            setSubmitting(false)
        },
        onSuccess: async (res) => {
            setSubmitting(false)
            const data = await res.json();
            if(data.response == "error") {
                if(data.error == "insufficient permission") {
                    toast({ title: "you have insufficent permission to create a permission group."})
                }
                else if(data.error == "permission group exists") {
                    toast({ title: "permission group already exists."})
                }
                else {
                    toast({
                        title: "Couldn't create permission group",
                        description: "Please create an issue on the GitHub repository."
                    })
                }
                return
            }
            toast({
                title: "Successfully created permission group."
            })
            queryClient.invalidateQueries({
                queryKey: ['pgcreate']
            })
        }
    })
    const formCreatePG = useForm<z.infer<typeof createPGFormSchema>>({
        resolver: zodResolver(createPGFormSchema),
        defaultValues: {
            pgroupName: "",
        }
    })

    function onSubmit(values: z.infer<typeof createPGFormSchema>) {
        setSubmitting(true)
        mutationCreatePG.mutate(values.pgroupName)
    }

    return (
        <div className="flex flex-col py-2">
            <div className="text-xl">Permission Groups</div>
            <Dialog>
            <DialogTrigger asChild><Button variant={"outline"}>Create Permission Group</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Create Permission Group</DialogTitle></DialogHeader>
                <Form {...formCreatePG}>
                    <form onSubmit={formCreatePG.handleSubmit(onSubmit)}>
                    <FormField
                        control={formCreatePG.control}
                        name="pgroupName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Permission Group Name</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormDescription>
                                    This is the name for the permission group.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                <DialogFooter><Button type="submit" disabled={submitting}>Submit</Button></DialogFooter>
                    </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default PermissionGroupDashboard