import { useIsFetching, useQuery } from "@tanstack/react-query"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Member } from "./MemberColumn"
import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { useAuth } from "@clerk/clerk-react"
import { CirclePlus, Loader2 } from "lucide-react"
import { Separator } from "../ui/separator"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"

interface MemberPopoverProps {
    member: Member
    trigger?: any
}



function MemberPopover(props: MemberPopoverProps) {
    const [enableQuery, setEnableQuery] = useState(false)
    const { getToken, isLoaded, userId } = useAuth();
    const { data, isFetching, isError } = useQuery({
        queryKey: [ "memberpopover", props.member.userid ],
        queryFn: async () => {
            const url = await invoke("get_server_url");
            // TODO verify that userId is a string and not null basically
            // /team/by-id/{team-id}/pgroups/{user-id}
            const endpoint = (url as string) + "/team/by-id/" + props.member.teamid + "/pgroups/" + props.member.userid as string;
            console.log(endpoint)
            const response = await fetch(endpoint, {
                headers: { Authorization: `Bearer ${await getToken()}` },
                method: "GET",
                mode: "cors",
              });
            return response.json();
        },
        enabled: enableQuery
    });

    /*
    check current user
    once we have current user, and popover trigger was clicked, do a query for user info
    if current user has permissions to manage, we add more things for setting their role and permission group
    */
    function setTheQueryToBeEnabledHehe() {
        console.log("toggle!")
        setEnableQuery((prevState) => !prevState)
    }

    function addUserToPermissionGroup() {
        console.log("implement me!")
    }

    function removeUserFromPermissionGroup() {
        console.log("implement me!")
    }

    // if clerk not available yet
    if(!isLoaded || !userId) {
        return (
            <div><Loader2 className="w-4 h-4 animate-spin" /></div>
        )
    }

    // if fetching data
    let content = <div>init</div>
    if( isFetching|| !data || !data.body) {
        content =  <div className="flex flex-row items-center space-x-2"><Loader2 className="w-4 h-4 animate-spin" /><span>Loading...</span></div>
    }
    else {
        console.log(data)
        // TODO the badge component here needs to be a new separate component
        let userGroups = (
            <div className="space-x-1 space-y-2">
                { data.body.user_permission_groups ? <div className="space-x-1 space-y-2">{ data.body.user_permission_groups.map((group: any) => {
                    return <Badge key={group.pgroupid}>{group.name}</Badge>
                })}</div> : <div></div> }
                
                { data.body.caller_role >= 2 ? <Badge variant={'outline'} className="hover:bg-secondary/80 cursor-pointer" onClick={addUserToPermissionGroup}>Add to permission group</Badge> : <></> }
            </div>
        )
        content = (
            <div className="flex flex-col space-y-2">
                <div>{props.member.name}'s permission groups:</div>
                {userGroups}
                <Separator />
                <div className="hover:bg-secondary/80 cursor-pointer rounded transition-all text-sm">Promote to Manager</div>
                <Separator />
                <div className="hover:bg-secondary/80 cursor-pointer rounded transition-all text-sm text-red-500">Kick Member</div>
            </div>
        )
    }


    return (
        <Popover onOpenChange={setTheQueryToBeEnabledHehe}>
            <PopoverTrigger>{props.trigger}</PopoverTrigger>
            <PopoverContent className="m-2">{content}</PopoverContent>
        </Popover>
    )
}

export default MemberPopover