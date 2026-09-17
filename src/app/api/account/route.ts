import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { requireSameOrigin } from "@/server/production";

const update = z.object({
  favorites: z.object({
    competitions: z
      .array(z.uuid())
      .max(100)
      .transform((ids) => [...new Set(ids)]),
    teams: z
      .array(z.uuid())
      .max(100)
      .transform((ids) => [...new Set(ids)]),
    players: z
      .array(z.uuid())
      .max(100)
      .transform((ids) => [...new Set(ids)]),
  }),
  preferences: z.object({
    matchStarting: z.boolean(),
    goal: z.boolean(),
    halftime: z.boolean(),
    fullTime: z.boolean(),
    lineups: z.boolean(),
  }),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  return Response.json(
    {
      favorites: {
        competitions: user.favorites.flatMap((item) =>
          item.competitionId ? [item.competitionId] : [],
        ),
        teams: user.favorites.flatMap((item) =>
          item.teamId ? [item.teamId] : [],
        ),
        players: user.favorites.flatMap((item) =>
          item.playerId ? [item.playerId] : [],
        ),
      },
      preferences: user.notificationPreference ?? {
        matchStarting: true,
        goal: true,
        halftime: false,
        fullTime: true,
        lineups: true,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: Request) {
  if (!requireSameOrigin(request))
    return Response.json(
      { error: "A same-origin request is required." },
      { status: 403 },
    );
  const user = await getCurrentUser();
  if (!user)
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  const parsed = update.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "Invalid account update." }, { status: 400 });
  const db = getDb();
  const [competitions, teams, players] = await Promise.all([
    db.competition.findMany({
      where: { id: { in: parsed.data.favorites.competitions } },
      select: { id: true },
    }),
    db.team.findMany({
      where: { id: { in: parsed.data.favorites.teams } },
      select: { id: true },
    }),
    db.player.findMany({
      where: { id: { in: parsed.data.favorites.players } },
      select: { id: true },
    }),
  ]);
  if (
    competitions.length !== new Set(parsed.data.favorites.competitions).size ||
    teams.length !== new Set(parsed.data.favorites.teams).size ||
    players.length !== new Set(parsed.data.favorites.players).size
  )
    return Response.json(
      { error: "One or more favorite entities do not exist." },
      { status: 400 },
    );
  await db.$transaction(async (tx) => {
    await tx.userFavorite.deleteMany({ where: { userId: user.id } });
    await tx.userFavorite.createMany({
      data: [
        ...parsed.data.favorites.competitions.map((competitionId) => ({
          userId: user.id,
          competitionId,
        })),
        ...parsed.data.favorites.teams.map((teamId) => ({
          userId: user.id,
          teamId,
        })),
        ...parsed.data.favorites.players.map((playerId) => ({
          userId: user.id,
          playerId,
        })),
      ],
    });
    await tx.userNotificationPreference.upsert({
      where: { userId: user.id },
      update: parsed.data.preferences,
      create: { userId: user.id, ...parsed.data.preferences },
    });
  });
  return Response.json({ ok: true });
}
