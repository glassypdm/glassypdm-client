import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

interface ProjectPageProps extends React.HTMLAttributes<HTMLDivElement> {}

function ProjectPage(props: ProjectPageProps) {
  const navigate = useNavigate();
  return (
    <div className={cn("", props.className)}>
      <h1 className="text-2xl mx-4">Manage Projects</h1>
      <Button onClick={() => navigate(-1)}>Back</Button>
      <Separator />
    </div>
  );
}

export default ProjectPage;
