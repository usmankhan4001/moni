"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { runAction } from "@/lib/action";
import { deleteProject, updateProjectStatus } from "@/app/actions";
type ProjectStatus = "active" | "completed" | "cancelled";

export function ProjectActions({
  projectId,
  title,
  status,
}: {
  projectId: string;
  title: string;
  status: ProjectStatus;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);

  const changeStatus = async (next: ProjectStatus) => {
    await runAction(updateProjectStatus, projectId, next);
  };

  const handleDelete = async () => {
    setPending(true);
    const result = await runAction(deleteProject, projectId);
    setPending(false);
    if (result?.ok) setConfirmDelete(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Project actions">
            &#8942;
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void changeStatus("active")} disabled={status === "active"}>
            Mark active
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void changeStatus("completed")} disabled={status === "completed"}>
            Mark completed
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void changeStatus("cancelled")} disabled={status === "cancelled"}>
            Mark cancelled
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
            Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the project permanently. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}