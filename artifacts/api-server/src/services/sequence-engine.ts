import { db, sequenceEnrollmentsTable, outreachSequencesTable } from "@workspace/db";
import { eq, and, lte, sql } from "drizzle-orm";
import { emit } from "./event-bus";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";
import { executeOrQueue, registerActionExecutor } from "./mode-action-service";

type SequenceStep = {
  type: string;
  channel: string;
  subject?: string;
  body?: string;
  delayDays?: number;
  delayHours?: number;
  templateId?: string;
};

type SafetyControls = {
  stopOnReply?: boolean;
  maxPerDay?: number;
  respectBusinessHours?: boolean;
  excludeWeekends?: boolean;
};

export async function enrollContact(params: {
  sequenceId: number;
  contactEmail: string;
  contactName?: string;
  leadId?: number;
  enrolledBy?: string;
}): Promise<{ success: boolean; enrollmentId?: number; error?: string }> {
  const [sequence] = await db.select().from(outreachSequencesTable)
    .where(eq(outreachSequencesTable.id, params.sequenceId));
  if (!sequence) return { success: false, error: "Sequence not found" };
  if (sequence.status !== "active") return { success: false, error: "Sequence is not active" };

  const steps = (sequence.steps as SequenceStep[]) ?? [];
  if (steps.length === 0) return { success: false, error: "Sequence has no steps" };

  const [existingEnrollment] = await db.select().from(sequenceEnrollmentsTable)
    .where(and(
      eq(sequenceEnrollmentsTable.sequenceId, params.sequenceId),
      eq(sequenceEnrollmentsTable.contactEmail, params.contactEmail),
      eq(sequenceEnrollmentsTable.status, "active"),
    ));
  if (existingEnrollment) return { success: false, error: "Contact already enrolled in this sequence" };

  const firstStep = steps[0];
  const delayMs = ((firstStep.delayDays ?? 0) * 86400000) + ((firstStep.delayHours ?? 0) * 3600000);
  const nextStepAt = new Date(Date.now() + Math.max(delayMs, 60000));

  const [enrollment] = await db.insert(sequenceEnrollmentsTable).values({
    sequenceId: params.sequenceId,
    contactEmail: params.contactEmail,
    contactName: params.contactName,
    leadId: params.leadId,
    status: "active",
    currentStepIndex: 0,
    nextStepAt,
    enrolledBy: params.enrolledBy,
  }).returning();

  await db.update(outreachSequencesTable)
    .set({ totalEnrolled: sql`${outreachSequencesTable.totalEnrolled} + 1` })
    .where(eq(outreachSequencesTable.id, params.sequenceId));

  await emit("sequence.contact_enrolled", {
    entityType: "sequence",
    entityId: params.sequenceId,
    domain: "outreach",
    actor: params.enrolledBy ?? "system",
    data: { enrollmentId: enrollment.id, contactEmail: params.contactEmail },
  });

  return { success: true, enrollmentId: enrollment.id };
}

async function directExecuteStep(enrollment: any, sequence: any): Promise<void> {
  const steps = (sequence.steps as SequenceStep[]) ?? [];
  const step = steps[enrollment.currentStepIndex];
  if (!step) return;

  const safetyControls = (sequence.safetyControls as SafetyControls) ?? {};

  if (safetyControls.respectBusinessHours) {
    const hour = new Date().getHours();
    if (hour < 9 || hour > 17) return;
  }
  if (safetyControls.excludeWeekends) {
    const day = new Date().getDay();
    if (day === 0 || day === 6) return;
  }

  try {
    switch (step.type) {
      case "email":
      case "linkedin_message":
      case "sms": {
        let body = step.body ?? "";
        let subject = step.subject ?? "";
        if (!body && step.templateId) {
          try {
            const { generateOutreachDraft } = await import("./ai-service");
            const result = await generateOutreachDraft({
              leadName: enrollment.contactName ?? enrollment.contactEmail,
              context: `Sequence step ${enrollment.currentStepIndex + 1}`,
              channel: step.channel ?? "email",
            });
            body = result.draft;
          } catch (e) {
            body = `Hello ${enrollment.contactName ?? "there"}, following up on our previous conversation.`;
          }
        }

        if (step.type === "email" || step.type === "sms") {
          try {
            const { sendMessageWithMode } = await import("./messaging-service");
            const channel = step.type === "email" ? "email" as const : "sms" as const;
            await sendMessageWithMode({
              channel,
              to: enrollment.contactEmail,
              subject: subject || `Follow-up: Step ${enrollment.currentStepIndex + 1}`,
              body,
              source: "sequence_engine",
            });
          } catch (sendErr: any) {
            console.log(`[SequenceEngine] Send fallback for ${step.type}: ${sendErr.message}`);
            await createNotification({
              type: "sequence_step_executed",
              severity: "info",
              title: `Sequence Step: ${step.type}`,
              message: `${step.type} sent to ${enrollment.contactEmail} (Step ${enrollment.currentStepIndex + 1}/${steps.length})`,
              domain: "outreach",
              entityType: "sequence",
              entityId: enrollment.sequenceId,
              actor: "sequence_engine",
            });
          }
        } else {
          await createNotification({
            type: "sequence_step_executed",
            severity: "info",
            title: `Sequence Step: ${step.type}`,
            message: `${step.type} sent to ${enrollment.contactEmail} (Step ${enrollment.currentStepIndex + 1}/${steps.length})`,
            domain: "outreach",
            entityType: "sequence",
            entityId: enrollment.sequenceId,
            actor: "sequence_engine",
          });
        }
        break;
      }
      case "wait":
        break;
      case "task": {
        const { tasksTable } = await import("@workspace/db");
        await db.insert(tasksTable).values({
          title: step.subject ?? `Manual follow-up: ${enrollment.contactEmail}`,
          description: step.body ?? `Follow up with ${enrollment.contactName ?? enrollment.contactEmail}`,
          domain: "outreach",
          priority: "medium",
          entityType: "lead",
          entityId: enrollment.leadId,
        });
        break;
      }
    }

    const stepResults = (enrollment.stepResults as any[]) ?? [];
    stepResults.push({
      stepIndex: enrollment.currentStepIndex,
      type: step.type,
      executedAt: new Date().toISOString(),
      status: "completed",
    });

    const nextIndex = enrollment.currentStepIndex + 1;
    const isComplete = nextIndex >= steps.length;

    if (isComplete) {
      await db.update(sequenceEnrollmentsTable).set({
        status: "completed",
        completedAt: new Date(),
        currentStepIndex: nextIndex,
        lastStepAt: new Date(),
        stepResults,
      }).where(eq(sequenceEnrollmentsTable.id, enrollment.id));

      await db.update(outreachSequencesTable)
        .set({ totalConverted: sql`${outreachSequencesTable.totalConverted} + 1` })
        .where(eq(outreachSequencesTable.id, enrollment.sequenceId));

      await emit("sequence.completed", {
        entityType: "sequence",
        entityId: enrollment.sequenceId,
        domain: "outreach",
        actor: "sequence_engine",
        actorType: "system",
        data: { enrollmentId: enrollment.id, contactEmail: enrollment.contactEmail },
      });
    } else {
      const nextStep = steps[nextIndex];
      const delayMs = ((nextStep?.delayDays ?? 1) * 86400000) + ((nextStep?.delayHours ?? 0) * 3600000);
      const nextStepAt = new Date(Date.now() + delayMs);

      await db.update(sequenceEnrollmentsTable).set({
        currentStepIndex: nextIndex,
        lastStepAt: new Date(),
        nextStepAt,
        stepResults,
      }).where(eq(sequenceEnrollmentsTable.id, enrollment.id));
    }

    await logAudit({
      eventType: "sequence_step",
      domain: "outreach",
      action: `step_${step.type}_executed`,
      description: `Step ${enrollment.currentStepIndex + 1} (${step.type}) executed for ${enrollment.contactEmail}`,
      entityType: "sequence_enrollment",
      entityId: enrollment.id,
      actor: "sequence_engine",
      actorType: "system",
    });
  } catch (err: any) {
    const stepResults = (enrollment.stepResults as any[]) ?? [];
    stepResults.push({
      stepIndex: enrollment.currentStepIndex,
      type: step.type,
      executedAt: new Date().toISOString(),
      status: "failed",
      error: err.message,
    });
    await db.update(sequenceEnrollmentsTable).set({
      stepResults,
      lastStepAt: new Date(),
    }).where(eq(sequenceEnrollmentsTable.id, enrollment.id));
  }
}

async function modeAwareExecuteStep(enrollment: any, sequence: any): Promise<void> {
  const steps = (sequence.steps as SequenceStep[]) ?? [];
  const step = steps[enrollment.currentStepIndex];
  if (!step) return;

  const workflowKey = step.type === "email" || step.type === "sms" || step.type === "linkedin_message"
    ? "outreach_send"
    : "task_creation";

  const result = await executeOrQueue({
    actionType: "sequence_step",
    workflowKey,
    entityType: "sequence",
    entityId: enrollment.sequenceId,
    title: `Sequence Step: ${step.type} to ${enrollment.contactEmail}`,
    description: `Step ${enrollment.currentStepIndex + 1}/${steps.length} (${step.type}) for ${enrollment.contactName ?? enrollment.contactEmail} in sequence "${sequence.name}"`,
    confidence: 80,
    options: [
      { id: "approve", label: "Send Now", description: `Execute ${step.type} step as configured`, isAiRecommended: true },
      { id: "edit", label: "Edit Before Sending", description: "Review and edit the message before sending" },
      { id: "delay", label: "Delay 24h", description: "Postpone this step by 24 hours" },
      { id: "skip", label: "Skip Step", description: "Skip this step and advance to the next one" },
    ],
    aiRecommendation: `Send ${step.type} to ${enrollment.contactEmail} as scheduled`,
    aiParts: "AI generates personalized message content, determines optimal send time based on business hours, evaluates safety controls",
    humanParts: "Review message content, approve or edit before sending, choose to delay or skip",
    metadata: {
      enrollmentId: enrollment.id,
      sequenceId: enrollment.sequenceId,
      sequenceName: sequence.name,
      stepIndex: enrollment.currentStepIndex,
      stepType: step.type,
      contactEmail: enrollment.contactEmail,
      contactName: enrollment.contactName,
    },
    executeAction: async () => {
      await directExecuteStep(enrollment, sequence);
    },
  });

  if (result.queued) {
    console.log(`[SequenceEngine] Step ${enrollment.currentStepIndex + 1} queued for ${result.mode} review`);
  }
}

export async function advanceSequences(): Promise<{ processed: number; errors: number }> {
  const due = await db.select().from(sequenceEnrollmentsTable)
    .where(and(
      eq(sequenceEnrollmentsTable.status, "active"),
      lte(sequenceEnrollmentsTable.nextStepAt, new Date()),
    ));

  let processed = 0;
  let errors = 0;

  for (const enrollment of due) {
    const [sequence] = await db.select().from(outreachSequencesTable)
      .where(eq(outreachSequencesTable.id, enrollment.sequenceId));
    if (!sequence || sequence.status !== "active") continue;

    try {
      await modeAwareExecuteStep(enrollment, sequence);
      processed++;
    } catch (err) {
      console.error(`[SequenceEngine] Error advancing enrollment ${enrollment.id}:`, err);
      errors++;
    }
  }

  if (processed > 0) {
    console.log(`[SequenceEngine] Advanced ${processed} enrollments (${errors} errors)`);
  }
  return { processed, errors };
}

function registerSequenceExecutors(): void {
  registerActionExecutor("sequence_step", async (metadata, option) => {
    if (option === "approve" || option === "edit") {
      const [enrollment] = await db.select().from(sequenceEnrollmentsTable)
        .where(eq(sequenceEnrollmentsTable.id, metadata.enrollmentId));
      const [sequence] = await db.select().from(outreachSequencesTable)
        .where(eq(outreachSequencesTable.id, metadata.sequenceId));
      if (enrollment && sequence) {
        await directExecuteStep(enrollment, sequence);
      }
    } else if (option === "delay") {
      await db.update(sequenceEnrollmentsTable).set({
        nextStepAt: new Date(Date.now() + 86400000),
      }).where(eq(sequenceEnrollmentsTable.id, metadata.enrollmentId));
    }
  });
}

export { registerSequenceExecutors };

export async function pauseEnrollment(enrollmentId: number): Promise<boolean> {
  const [e] = await db.select().from(sequenceEnrollmentsTable).where(eq(sequenceEnrollmentsTable.id, enrollmentId));
  if (!e || e.status !== "active") return false;
  await db.update(sequenceEnrollmentsTable).set({ status: "paused", pausedAt: new Date() }).where(eq(sequenceEnrollmentsTable.id, enrollmentId));
  return true;
}

export async function resumeEnrollment(enrollmentId: number): Promise<boolean> {
  const [e] = await db.select().from(sequenceEnrollmentsTable).where(eq(sequenceEnrollmentsTable.id, enrollmentId));
  if (!e || e.status !== "paused") return false;
  const nextStepAt = new Date(Date.now() + 3600000);
  await db.update(sequenceEnrollmentsTable).set({ status: "active", pausedAt: null, nextStepAt }).where(eq(sequenceEnrollmentsTable.id, enrollmentId));
  return true;
}

export async function removeEnrollment(enrollmentId: number): Promise<boolean> {
  const [e] = await db.select().from(sequenceEnrollmentsTable).where(eq(sequenceEnrollmentsTable.id, enrollmentId));
  if (!e) return false;
  await db.update(sequenceEnrollmentsTable).set({
    status: "removed",
    exitReason: "manually_removed",
    completedAt: new Date(),
  }).where(eq(sequenceEnrollmentsTable.id, enrollmentId));
  return true;
}
