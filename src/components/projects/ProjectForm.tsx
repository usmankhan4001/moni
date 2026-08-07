"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { runAction } from "@/lib/action";
import { createProject } from "@/app/actions";
import type { Outsourcer } from "@/lib/data";
type ProjectStatus = "active" | "completed" | "cancelled";

export function ProjectForm({
  outsourcers,
  emptyState = false,
}: {
  outsourcers: Outsourcer[];
  emptyState?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [outsourcerId, setOutsourcerId] = useState("none");
  const [status, setStatus] = useState<ProjectStatus>("active");

  const handleSubmit = async () => {
    const amountUsd = Number(amount);
    if (!title.trim()) {
      toast.error("Give the project a title.");
      return;
    }
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      toast.error("Enter a positive project value.");
      return;
    }
    setPending(true);
    const result = await runAction(createProject, {
      title,
      amountUsd,
      outsourcerId: outsourcerId === "none" ? null : outsourcerId,
      status,
    });
    setPending(false);
    if (result?.ok) {
      setOpen(false);
      setTitle("");
      setAmount("");
      setOutsourcerId("none");
      setStatus("active");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {emptyState ? (
        <EmptyState
          title="No projects yet"
          description="Add your first project to start tracking outsourcer dues."
          actionLabel="Add your first project"
          onAction={() => setOpen(true)}
        />
      ) : (
        <DialogTrigger asChild>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm px-5 text-xs uppercase tracking-widest">
            Add project
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Add a project and assign an outsourcer. Payments are generated from completed,
            assigned projects.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="project-title">Title</Label>
            <Input
              id="project-title"
              placeholder="E.g. Landing page redesign"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-amount">Value (USD)</Label>
            <Input
              id="project-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Outsourcer</Label>
            <Select value={outsourcerId} onValueChange={setOutsourcerId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {outsourcers.map((outsourcer) => (
                  <SelectItem key={outsourcer.id} value={outsourcer.id}>
                    {outsourcer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "Saving…" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}