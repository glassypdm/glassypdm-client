import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { Input } from "../ui/input"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@clerk/clerk-react"
import { useState } from "react"
import { useToast } from "../ui/use-toast"
import { PermissionGroupTable } from "./pgrouptable"
import { columns } from "./pgroupcolumn"

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
    const { data, isPending, isError, error } = useQuery({
        queryKey: ['pgroup'],
        queryFn: async () => {
            const endpoint = props.serverUrl + "/team/by-id/" + props.teamId as string + "/pgroup/list";
            const resp = await fetch(endpoint, {
                headers: { Authorization: `Bearer ${await getToken()}`},
                method: "GET",
                mode: "cors"
            })
            return resp.json();
        }
    })
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
                queryKey: ['pgroup']
            })
        }
    })
    const formCreatePG = useForm<z.infer<typeof createPGFormSchema>>({
        resolver: zodResolver(createPGFormSchema),
        defaultValues: {
            pgroupName: "",
        }
    });

    let pgroupList = <></>
    if(isPending) {
        pgroupList = <div>Loading permission groups...</div>
    }
    else if(isError) {
        // TODO log error
        pgroupList = <div>An error occured while fetching data :c</div>
    }
    else if(data.response == "success"){
        if(data.body && data.body.length > 0) {
            let pgroupdata = data.body;
            for(let i = 0; i < pgroupdata.length; i++) {
                pgroupdata[i].url = props.serverUrl;
            }
            console.log()
            pgroupList = <PermissionGroupTable columns={columns} data={pgroupdata} />
        }
        else {
            pgroupList = <div>No permission groups found</div>
        }
    }

    function onSubmit(values: z.infer<typeof createPGFormSchema>) {
        setSubmitting(true)
        mutationCreatePG.mutate(values.pgroupName)
    }

    return (
        <div className="flex flex-col py-2 space-y-2">
            <Dialog>
            <DialogTrigger asChild><Button variant={"outline"} className="flex-0 max-w-48">Create Permission Group</Button></DialogTrigger>
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
            {pgroupList}
        </div>
    )
}

export default PermissionGroupDashboard