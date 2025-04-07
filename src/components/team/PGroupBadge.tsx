import { Badge } from "../ui/badge";
import { Circle, CircleX } from "lucide-react";

interface PGroupBadgeProps {
  user: string;
  pgroup_name: string;
  pgroup_id: number;
  can_remove: boolean;
}

function PGroupBadge(props: PGroupBadgeProps) {
  function removeFromPGroup() {
    console.log("Remove!")
    // do the thing
    // if successful:
    // invalidate pgroup query for user
    // otherwise s o n n e r  and say unsuccessful
  }

  return (
    <Badge className="space-x-1" variant={'no_hover'}>
      {props.can_remove ? (
        <div className="group relative w-4 h-4">
            {/** i don't know why this works but it works so please don't touch this lmao */}
          <CircleX
            className="absolute w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          />
          <Circle
          className="absolute w-4 h-4 opacity-100 group-hover:opacity-0 transition-opacity cursor-pointer duration-200"
          onClick={removeFromPGroup}
          />
        </div>
      ) : (
        <></>
      )}
      <span>{props.pgroup_name}</span>
    </Badge>
  );
}

export default PGroupBadge;
