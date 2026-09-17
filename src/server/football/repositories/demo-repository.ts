import "server-only";
import type { Competition, FootballMatch, Team } from "@/lib/football/types";
import type { FootballReadRepository } from "./repository";
import { shiftDate } from "@/lib/football/filters";

const competitions: Competition[] = [
  {
    id: "champions-league",
    name: "UEFA Champions League",
    shortName: "Champions League",
    region: "Europe",
    kind: "international",
    color: "#3158c9",
    countryCode: null,
  },
  {
    id: "premier-league",
    name: "Premier League",
    shortName: "Premier League",
    region: "England",
    kind: "league",
    color: "#623282",
    countryCode: "GB-ENG",
  },
  {
    id: "la-liga",
    name: "LaLiga",
    shortName: "LaLiga",
    region: "Spain",
    kind: "league",
    color: "#cc493b",
    countryCode: "ES",
  },
  {
    id: "serie-a",
    name: "Serie A",
    shortName: "Serie A",
    region: "Italy",
    kind: "league",
    color: "#2673bf",
    countryCode: "IT",
  },
  {
    id: "bundesliga",
    name: "Bundesliga",
    shortName: "Bundesliga",
    region: "Germany",
    kind: "league",
    color: "#c52d43",
    countryCode: "DE",
  },
  {
    id: "ligue-1",
    name: "Ligue 1",
    shortName: "Ligue 1",
    region: "France",
    kind: "league",
    color: "#557319",
    countryCode: "FR",
  },
  {
    id: "fa-cup",
    name: "FA Cup",
    shortName: "FA Cup",
    region: "England",
    kind: "cup",
    color: "#b64865",
    countryCode: "GB-ENG",
  },
  {
    id: "libertadores",
    name: "CONMEBOL Libertadores",
    shortName: "Libertadores",
    region: "South America",
    kind: "international",
    color: "#9a711e",
    countryCode: null,
  },
];

function team(
  id: string,
  name: string,
  shortName: string,
  color: string,
  accent = "#ffffff",
  crestId?: number,
): Team {
  return {
    id,
    name,
    shortName,
    logoUrl: crestId
      ? `https://crests.football-data.org/${crestId}.png`
      : null,
    color,
    accent,
  };
}

const teams = {
  arsenal: team("arsenal", "Arsenal", "ARS", "#c93542", "#ffffff", 57),
  chelsea: team("chelsea", "Chelsea", "CHE", "#2454a4", "#ffffff", 61),
  liverpool: team("liverpool", "Liverpool", "LIV", "#be263c", "#ffffff", 64),
  city: team("man-city", "Manchester City", "MCI", "#87b9d7", "#163754", 65),
  newcastle: team("newcastle", "Newcastle United", "NEW", "#343b40", "#ffffff", 67),
  villa: team("aston-villa", "Aston Villa", "AVL", "#7d3050", "#bde5f5", 58),
  madrid: team("real-madrid", "Real Madrid", "RMA", "#f2f0e7", "#866921", 86),
  bayern: team("bayern", "Bayern Munich", "BAY", "#c43145", "#ffffff", 5),
  barcelona: team("barcelona", "Barcelona", "BAR", "#244681", "#f2c657", 81),
  atletico: team("atletico", "Atlético Madrid", "ATM", "#c23841", "#ffffff", 78),
  betis: team("betis", "Real Betis", "BET", "#237b53", "#ffffff", 90),
  sevilla: team("sevilla", "Sevilla", "SEV", "#f0eeee", "#c33846", 559),
  inter: team("inter", "Inter Milan", "INT", "#234b9c", "#ffffff", 108),
  milan: team("milan", "AC Milan", "MIL", "#b52a38", "#ffffff", 98),
  juventus: team("juventus", "Juventus", "JUV", "#303337", "#ffffff", 109),
  napoli: team("napoli", "Napoli", "NAP", "#1d74ab", "#ffffff", 113),
  dortmund: team("dortmund", "Borussia Dortmund", "BVB", "#e7cb27", "#252b30", 4),
  leverkusen: team("leverkusen", "Bayer Leverkusen", "B04", "#c3323b", "#ffffff", 3),
  psg: team("psg", "Paris Saint-Germain", "PSG", "#1e426d", "#ffffff", 524),
  marseille: team("marseille", "Marseille", "OM", "#237ba0", "#ffffff", 516),
  flamengo: team("flamengo", "Flamengo", "FLA", "#b33138"),
  river: team("river", "River Plate", "RIV", "#f0eeee", "#bc3544"),
};

type Fixture = [string, keyof typeof teams, keyof typeof teams, string, string];
const fixtures: Fixture[] = [
  ["champions-league", "madrid", "bayern", "19:00", "Santiago Bernabéu"],
  ["champions-league", "psg", "inter", "19:00", "Parc des Princes"],
  ["premier-league", "arsenal", "chelsea", "16:30", "Emirates Stadium"],
  ["premier-league", "city", "liverpool", "17:30", "Etihad Stadium"],
  ["premier-league", "newcastle", "villa", "14:00", "St. James’ Park"],
  ["la-liga", "barcelona", "atletico", "20:00", "Camp Nou"],
  ["la-liga", "betis", "sevilla", "16:00", "Benito Villamarín"],
  ["serie-a", "milan", "juventus", "18:45", "San Siro"],
  ["serie-a", "napoli", "inter", "16:00", "Stadio Diego Armando Maradona"],
  ["bundesliga", "dortmund", "leverkusen", "16:30", "Signal Iduna Park"],
  ["ligue-1", "marseille", "psg", "18:45", "Orange Vélodrome"],
  ["libertadores", "flamengo", "river", "23:30", "Maracanã"],
];

/** Fictional fixtures, relative to today's UTC date. No claim of live coverage. */
export class DemoFootballRepository implements FootballReadRepository {
  async getSnapshot() {
    const generatedAt = new Date().toISOString();
    const referenceDate = generatedAt.slice(0, 10);
    const matches: FootballMatch[] = [-2, -1, 0, 1, 2].flatMap((offset) => {
      const date = shiftDate(referenceDate, offset);
      return fixtures.map(([competitionId, home, away, time, venue], index) => {
        const status =
          offset < 0
            ? "finished"
            : offset > 0
              ? "scheduled"
              : [0, 2, 9].includes(index)
                ? "live"
                : [4, 6, 8].includes(index)
                  ? "finished"
                  : "scheduled";
        return {
          id: `demo-${date}-${index}`,
          competitionId,
          season: "Preview season",
          round: "Sample fixture",
          kickoff: `${date}T${time}:00.000Z`,
          status,
          minute:
            status === "live" ? [67, 0, 34, 0, 0, 0, 0, 0, 0, 72][index] : null,
          home: teams[home],
          away: teams[away],
          homeScore: status === "scheduled" ? null : (index % 3) + 1,
          awayScore: status === "scheduled" ? null : index % 2,
          venue,
        };
      });
    });
    return {
      source: "demo" as const,
      referenceDate,
      generatedAt,
      competitions,
      matches,
    };
  }
}
