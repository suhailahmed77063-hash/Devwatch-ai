"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ChevronRight, Clock, FileCode2, Shield, Rocket } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface PlanStep {
  label: string;
  status?: "pending" | "running" | "done" | "error";
}

interface PlanData {
  planId: string;
  steps: string[];
  summary: string;
  operations?: { kind: string; path: string }[];
  runTests?: boolean;
  isNewProject?: boolean;
  fileCount?: number;
}

interface PlanPanelProps {
  projectId: string;
  canEdit: boolean;
  onPlanApproved: (planId: string, message: string) => void;
  currentPlan: PlanData | null;
  onClearPlan: () => void;
}

export function PlanPanel({ projectId, canEdit, onPlanApproved, currentPlan, onClearPlan }: PlanPanelProps) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [editingSteps, setEditingSteps] = useState<string[] | null>(null);

  const handleApprove = useCallback(async () => {
    if (!currentPlan || !canEdit) return;
    setApproving(true);
    try {
      // First, consume the plan to verify it's still valid
      const res = await fetch(`/api/projects/${projectId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", planId: currentPlan.planId }),
      });
      const data = await res.json();

      if (!data.success) {
        toast(data.error || "Plan expired or invalid", "error");
        onClearPlan();
        return;
      }

      toast("Plan approved — executing...", "success");
      onPlanApproved(currentPlan.planId, currentPlan.summary);
      onClearPlan();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Approval failed", "error");
    } finally {
      setApproving(false);
    }
  }, [currentPlan, canEdit, projectId, onPlanApproved, onClearPlan]);

  const handleReject = useCallback(async () => {
    if (!currentPlan) return;
    setRejecting(true);
    try {
      await fetch(`/api/projects/${projectId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", planId: currentPlan.planId }),
      });
      toast("Plan rejected", "info");
      onClearPlan();
    } catch {
      toast("Failed to reject plan", "error");
    } finally {
      setRejecting(false);
    }
  }, [currentPlan, projectId, onClearPlan]);

  if (!currentPlan) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-3">
          <FileCode2 className="w-6 h-6 text-zinc-600" />
        </div>
        <h3 className="text-sm font-medium text-zinc-400 mb-1">Plan Mode</h3>
        <p className="text-xs text-zinc-600 max-w-[200px]">
          Describe what you want to build. The AI will create a plan for your review before executing.
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-zinc-600">
          <Shield className="w-3 h-3" />
          <span>No changes made until you approve</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Plan header */}
      <div className="px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-1">
          {currentPlan.isNewProject ? (
            <Rocket className="w-3.5 h-3.5 text-acc-soft" />
          ) : (
            <FileCode2 className="w-3.5 h-3.5 text-acc-soft" />
          )}
          <span className="text-xs font-semibold text-zinc-300">
            {currentPlan.isNewProject ? "New Project Plan" : "Edit Plan"}
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">{currentPlan.summary}</p>
      </div>

      {/* Plan steps */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {currentPlan.steps.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-zinc-800/30 group"
          >
            <div className="mt-0.5 flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <span className="text-[10px] text-zinc-400 font-mono">{i + 1}</span>
              </div>
            </div>
            <span className="text-[11px] text-zinc-400 leading-relaxed">{step}</span>
          </div>
        ))}

        {/* File operations summary */}
        {currentPlan.operations && currentPlan.operations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-800/50">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">File Changes</p>
            <div className="space-y-0.5">
              {currentPlan.operations.slice(0, 10).map((op, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                  <span className={`${
                    op.kind === "create" ? "text-green-400" :
                    op.kind === "delete" ? "text-red-400" :
                    op.kind === "rename" ? "text-blue-400" :
                    "text-yellow-400"
                  }`}>
                    {op.kind === "create" ? "+" : op.kind === "delete" ? "−" : op.kind === "rename" ? "→" : "~"}
                  </span>
                  <span className="text-zinc-500 font-mono truncate">{op.path}</span>
                </div>
              ))}
              {currentPlan.operations.length > 10 && (
                <p className="text-[10px] text-zinc-600 mt-1">
                  +{currentPlan.operations.length - 10} more files
                </p>
              )}
            </div>
          </div>
        )}

        {/* QA info */}
        {currentPlan.runTests && (
          <div className="mt-3 pt-3 border-t border-zinc-800/50">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <CheckCircle2 className="w-3 h-3" />
              <span>Automated QA will run after changes</span>
            </div>
          </div>
        )}
      </div>

      {/* Approve / Reject buttons */}
      {canEdit && (
        <div className="shrink-0 p-3 border-t border-zinc-800 space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-500 text-white"
              onClick={handleApprove}
              disabled={approving || rejecting}
            >
              {approving ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1.5" />
                  Approve & Execute
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/30"
              onClick={handleReject}
              disabled={approving || rejecting}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </Button>
          </div>
          <p className="text-[10px] text-zinc-600 text-center">
            Review the plan above. No changes will be made until you approve.
          </p>
        </div>
      )}
    </div>
  );
}
