import { z } from "zod";

const NotificationSchema = z.object({
  email: z.string().email(),
  message: z.string().min(1).max(500),
  channel: z.enum(["email", "sms", "push"]).default("email"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const notification = NotificationSchema.parse(body);

    const id = crypto.randomUUID();

    console.log("Notification queued", { id, channel: notification.channel });

    return Response.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { ok: false, error: "Invalid request body", issues: error.issues },
        { status: 400 }
      );
    }

    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
