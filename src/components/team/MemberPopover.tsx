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
import PGroupBadge from "./PGroupBadge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"

interface MemberPopoverProps {
    member: Member
    trigger?: any
}

function stringRoleToNumber(role: string) {
    if(role == "Owner") return 3;
    if(role == "Manager") return 2;
    if(role == "Member") return 1;
    return 0;
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

    // TODO actions
    const promoteManager = <Button variant={'outline'}>Promote to Manager</Button>
    const demoteManager = <Button variant={'outline'}>Demote to Member</Button>
    const promoteOwner = <Button variant={'outline'}>Promote to Owner</Button>
    const kickMember = <Button variant={'outline'} className="text-red-600">Kick Member</Button>

    // if fetching data
    let content = <div>no data available</div>
    if( isFetching|| !data || !data.body) {
        content =  <div className="flex flex-row items-center space-x-2"><Loader2 className="w-4 h-4 animate-spin" /><span>Loading...</span></div>
    }
    else {
        console.log(data)
        let userGroups = (
            <div className="space-x-1 space-y-2">
                { data.body.user_permission_groups ? <div className="space-x-1 space-y-2">{ data.body.user_permission_groups.map((group: any) => {
                    return <PGroupBadge
                                key={group.pgroupid}
                                pgroup_id={group.pgroupid}
                                pgroup_name={group.name}
                                user={props.member.userid}
                                can_remove={true}/>
                })}</div> : <div></div> }
                
                { data.body.caller_role >= 2 ? <Badge variant={'outline'} className="hover:bg-secondary/80 cursor-pointer" onClick={addUserToPermissionGroup}>Add to permission group</Badge> : <></> }
            </div>
        )

        let userManagement = <>
            {data.body.caller_role == 3 ? promoteOwner : <></>}
            {data.body.caller_role >= 2 && stringRoleToNumber(props.member.role) < 2 ? promoteManager : <></>}
            {data.body.caller_role == 3 && stringRoleToNumber(props.member.role) == 2 ? demoteManager : <></>}
            {data.body.caller_role >= 2 && (stringRoleToNumber(props.member.role) < 2 || data.body.caller_role == 3) ? kickMember : <></>}
        </>;

        content = (
            <div className="flex flex-col space-y-2">
                <div>{props.member.name}'s permission groups:</div>
                {userGroups}
                <Separator />
                { userId != props.member.userid ? userManagement : <></> }
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