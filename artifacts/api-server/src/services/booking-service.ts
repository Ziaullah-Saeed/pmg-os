import { db, communicationsTable, contactsTable, companiesTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";
import { broadcast } from "./websocket-service";
import { executeOrQueue } from "./mode-action-service";

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface BookingRequest {
  contactId?: number;
  companyId?: number;
  opportunityId?: number;
  contactName?: string;
  contactEmail?: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes?: number;
  meetingType?: string;
  location?: string;
  attendees?: string[];
}

export interface BookingResult {
  success: boolean;
  bookingId?: number;
  communicationId?: number;
  scheduledAt?: string;
  durationMinutes?: number;
  error?: string;
  queued?: boolean;
}

const DEFAULT_BUSINESS_HOURS = {
  start: 9,
  end: 17,
  slotDuration: 30,
  timezone: "America/New_York",
  excludeWeekends: true,
};

export async function getAvailableSlots(params: {
  date: string;
  durationMinutes?: number;
}): Promise<TimeSlot[]> {
  const date = new Date(params.date);
  const duration = params.durationMinutes ?? DEFAULT_BUSINESS_HOURS.slotDuration;

  const dayOfWeek = date.getDay();
  if (DEFAULT_BUSINESS_HOURS.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return [];
  }

  const dayStart = new Date(date);
  dayStart.setHours(DEFAULT_BUSINESS_HOURS.start, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(DEFAULT_BUSINESS_HOURS.end, 0, 0, 0);

  const existingMeetings = await db.select({
    scheduledAt: communicationsTable.scheduledAt,
    duration: communicationsTable.duration,
  }).from(communicationsTable)
    .where(and(
      eq(communicationsTable.type, "meeting"),
      gte(communicationsTable.scheduledAt, dayStart),
      lte(communicationsTable.scheduledAt, dayEnd),
    ));

  const bookedSlots = existingMeetings.map(m => ({
    start: new Date(m.scheduledAt!).getTime(),
    end: new Date(m.scheduledAt!).getTime() + ((m.duration ?? 30) * 60000),
  }));

  const slots: TimeSlot[] = [];
  let current = dayStart.getTime();
  const slotMs = duration * 60000;

  while (current + slotMs <= dayEnd.getTime()) {
    const slotEnd = current + slotMs;
    const isBooked = bookedSlots.some(b => current < b.end && slotEnd > b.start);

    slots.push({
      start: new Date(current).toISOString(),
      end: new Date(slotEnd).toISOString(),
      available: !isBooked,
    });

    current += slotMs;
  }

  return slots;
}

export async function createBooking(params: BookingRequest): Promise<BookingResult> {
  const scheduledAt = new Date(params.scheduledAt);
  const duration = params.durationMinutes ?? 30;

  if (scheduledAt < new Date()) {
    return { success: false, error: "Cannot book meetings in the past" };
  }

  const slotEnd = new Date(scheduledAt.getTime() + duration * 60000);
  const conflicts = await db.select({ id: communicationsTable.id })
    .from(communicationsTable)
    .where(and(
      eq(communicationsTable.type, "meeting"),
      gte(communicationsTable.scheduledAt, new Date(scheduledAt.getTime() - duration * 60000)),
      lte(communicationsTable.scheduledAt, slotEnd),
    ));

  if (conflicts.length > 0) {
    return { success: false, error: "Time slot conflicts with existing meeting" };
  }

  try {
    const [meeting] = await db.insert(communicationsTable).values({
      type: "meeting",
      direction: "outbound",
      subject: params.title,
      summary: params.description ?? `Meeting: ${params.title}`,
      contactId: params.contactId,
      companyId: params.companyId,
      opportunityId: params.opportunityId,
      duration,
      outcome: "meeting_booked",
      performedBy: "booking_service",
      scheduledAt,
    }).returning();

    await logAudit({
      eventType: "meeting_booked",
      domain: "communications",
      action: "create_booking",
      description: `Meeting booked: "${params.title}" at ${scheduledAt.toISOString()} (${duration}min)${params.contactName ? ` with ${params.contactName}` : ""}`,
      entityType: "communication",
      entityId: meeting.id,
      actor: "booking_service",
      actorType: "system",
    });

    await createNotification({
      type: "meeting_booked",
      severity: "info",
      title: "Meeting Booked",
      message: `"${params.title}" scheduled for ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString()}${params.contactName ? ` with ${params.contactName}` : ""}`,
      domain: "communications",
      entityType: "communication",
      entityId: meeting.id,
      actor: "booking_service",
    });

    broadcast("meeting_booked", {
      communicationId: meeting.id,
      title: params.title,
      scheduledAt: scheduledAt.toISOString(),
      duration,
      contactName: params.contactName,
    });

    return {
      success: true,
      bookingId: meeting.id,
      communicationId: meeting.id,
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes: duration,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createBookingWithMode(params: BookingRequest & { confidence?: number }): Promise<BookingResult> {
  const confidence = params.confidence ?? 75;

  const result = await executeOrQueue({
    actionType: "book_meeting",
    workflowKey: "meeting_booking",
    entityType: "communication",
    title: `Book Meeting: ${params.title}`,
    description: `Schedule "${params.title}" for ${new Date(params.scheduledAt).toLocaleString()}${params.contactName ? ` with ${params.contactName}` : ""} (${params.durationMinutes ?? 30}min)`,
    confidence,
    aiRecommendation: "approve",
    aiParts: `AI identified optimal meeting time and prepared booking`,
    humanParts: `Review meeting details, confirm scheduling`,
    options: [
      { id: "book", label: "Book Meeting", description: "Confirm and schedule the meeting", isAiRecommended: true },
      { id: "reschedule", label: "Suggest Different Time", description: "Pick a different time slot" },
      { id: "cancel", label: "Cancel", description: "Do not book" },
    ],
    metadata: {
      title: params.title,
      scheduledAt: params.scheduledAt,
      duration: params.durationMinutes,
      contactName: params.contactName,
      contactEmail: params.contactEmail,
    },
    executeAction: async (option) => {
      if (option === "cancel") return { success: false, cancelled: true };
      return createBooking(params);
    },
  });

  if (result.queued) {
    return { success: false, queued: true, error: "Booking queued for human approval" };
  }

  return result.result ?? { success: false, error: "Booking execution failed" };
}

export async function cancelBooking(communicationId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const [meeting] = await db.select().from(communicationsTable)
      .where(and(eq(communicationsTable.id, communicationId), eq(communicationsTable.type, "meeting")));

    if (!meeting) {
      return { success: false, error: "Meeting not found" };
    }

    await db.update(communicationsTable).set({
      outcome: "cancelled",
      completedAt: new Date(),
    }).where(eq(communicationsTable.id, communicationId));

    await logAudit({
      eventType: "meeting_cancelled",
      domain: "communications",
      action: "cancel_booking",
      description: `Meeting cancelled: "${meeting.subject}"`,
      entityType: "communication",
      entityId: communicationId,
      actor: "booking_service",
      actorType: "system",
    });

    await createNotification({
      type: "meeting_cancelled",
      severity: "warning",
      title: "Meeting Cancelled",
      message: `"${meeting.subject}" has been cancelled`,
      domain: "communications",
      entityType: "communication",
      entityId: communicationId,
      actor: "booking_service",
    });

    broadcast("meeting_cancelled", { communicationId, title: meeting.subject });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getUpcomingMeetings(limit = 10): Promise<any[]> {
  return db.select({
    id: communicationsTable.id,
    title: communicationsTable.subject,
    description: communicationsTable.summary,
    scheduledAt: communicationsTable.scheduledAt,
    duration: communicationsTable.duration,
    contactId: communicationsTable.contactId,
    contactName: contactsTable.firstName,
    companyId: communicationsTable.companyId,
    companyName: companiesTable.name,
    outcome: communicationsTable.outcome,
  }).from(communicationsTable)
    .leftJoin(contactsTable, eq(communicationsTable.contactId, contactsTable.id))
    .leftJoin(companiesTable, eq(communicationsTable.companyId, companiesTable.id))
    .where(and(
      eq(communicationsTable.type, "meeting"),
      eq(communicationsTable.outcome, "meeting_booked"),
      gte(communicationsTable.scheduledAt, new Date()),
    ))
    .orderBy(communicationsTable.scheduledAt)
    .limit(limit);
}
