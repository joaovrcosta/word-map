import { periodStart } from "../points";

describe("periodStart", () => {
  it("não limita o total", () => {
    expect(periodStart("lifetime", new Date("2026-10-14T15:00:00Z"))).toBeNull();
  });

  it("começa o mês no dia 1 em São Paulo", () => {
    const start = periodStart("month", new Date("2026-10-14T15:00:00Z"));
    expect(start?.toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });

  it("começa a semana na segunda em São Paulo", () => {
    const start = periodStart("week", new Date("2026-10-14T15:00:00Z"));
    expect(start?.toISOString()).toBe("2026-10-12T03:00:00.000Z");
  });
});
