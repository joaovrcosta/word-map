import {
  applyStudyCredit,
  clampHeartbeatSeconds,
  effectiveStreak,
  nextStreakOnComplete,
  studyDay,
  studyLastSevenDays,
  studyWeekdayShortPt,
  studyYesterday,
} from "../study";

describe("clampHeartbeatSeconds", () => {
  it("clampa em 0..30", () => {
    expect(clampHeartbeatSeconds(-3)).toBe(0);
    expect(clampHeartbeatSeconds(15.9)).toBe(15);
    expect(clampHeartbeatSeconds(99)).toBe(30);
  });
});

describe("studyDay / studyYesterday", () => {
  it("formata YYYY-MM-DD em America/Sao_Paulo", () => {
    // 2026-10-28 02:30 UTC = 2026-10-27 23:30 SP
    expect(studyDay(new Date("2026-10-28T02:30:00Z"))).toBe("2026-10-27");
    expect(studyYesterday(new Date("2026-10-28T02:30:00Z"))).toBe("2026-10-26");
  });

  it("trata virada de mês", () => {
    // 2026-11-01 02:30 UTC = 2026-10-31 23:30 SP (sem DST no Brasil)
    expect(studyDay(new Date("2026-11-01T02:30:00Z"))).toBe("2026-10-31");
    expect(studyYesterday(new Date("2026-11-01T02:30:00Z"))).toBe("2026-10-30");
  });

  it("lista os últimos 7 dias terminando hoje", () => {
    const days = studyLastSevenDays(new Date("2026-10-28T18:00:00Z"));
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-10-22");
    expect(days[6]).toBe("2026-10-28");
    expect(studyWeekdayShortPt("2026-10-28")).toBe("qua.");
  });
});

describe("applyStudyCredit", () => {
  const t0 = new Date("2026-10-28T15:00:00Z");

  it("credita o pedido quando não há âncora", () => {
    const result = applyStudyCredit({ now: t0, creditedUntil: null, seconds: 15 });
    expect(result.applied).toBe(15);
    expect(result.creditedUntil.getTime()).toBe(t0.getTime());
  });

  it("não concede +5 por request — spam não passa do tempo real", () => {
    let creditedUntil: Date | null = null;
    let total = 0;
    let now = t0;
    for (let i = 0; i < 10; i++) {
      const result = applyStudyCredit({ now, creditedUntil, seconds: 30 });
      total += result.applied;
      creditedUntil = result.creditedUntil;
      now = new Date(now.getTime() + 1000);
    }
    // 10s de wall-clock (+ janela inicial no primeiro tick até 35s, mas âncora começa em now-30)
    // primeiro tick: anchor = now-30, allowed=30, applied=30, creditedUntil=now
    // depois: 1s cada → +1 * 9 = 9 → total 39
    expect(total).toBe(39);
  });

  it("após pausa longa, não acumula mais que a janela de 35s", () => {
    const creditedUntil = new Date(t0.getTime() - 120_000);
    const result = applyStudyCredit({ now: t0, creditedUntil, seconds: 30 });
    expect(result.applied).toBe(30);
    expect(result.creditedUntil.getTime()).toBe(t0.getTime() - 5_000);
  });

  it("retry imediato após crédito total recebe allowed ≈ 0", () => {
    const first = applyStudyCredit({ now: t0, creditedUntil: null, seconds: 15 });
    const second = applyStudyCredit({
      now: t0,
      creditedUntil: first.creditedUntil,
      seconds: 15,
    });
    expect(second.applied).toBe(0);
    expect(second.creditedUntil.getTime()).toBe(first.creditedUntil.getTime());
  });
});

describe("effectiveStreak / nextStreakOnComplete", () => {
  it("zera streak morto com gap de 2+ dias", () => {
    expect(
      effectiveStreak({
        currentStreak: 7,
        lastGoalDate: "2026-10-25",
        today: "2026-10-28",
        yesterday: "2026-10-27",
      })
    ).toBe(0);
  });

  it("mantém streak se lastGoalDate é ontem ou hoje", () => {
    expect(
      effectiveStreak({
        currentStreak: 3,
        lastGoalDate: "2026-10-27",
        today: "2026-10-28",
        yesterday: "2026-10-27",
      })
    ).toBe(3);
  });

  it("incrementa de ontem, reinicia em gap, no-op hoje", () => {
    expect(
      nextStreakOnComplete({
        currentStreak: 2,
        lastGoalDate: "2026-10-27",
        today: "2026-10-28",
        yesterday: "2026-10-27",
      })
    ).toBe(3);
    expect(
      nextStreakOnComplete({
        currentStreak: 2,
        lastGoalDate: "2026-10-25",
        today: "2026-10-28",
        yesterday: "2026-10-27",
      })
    ).toBe(1);
    expect(
      nextStreakOnComplete({
        currentStreak: 5,
        lastGoalDate: "2026-10-28",
        today: "2026-10-28",
        yesterday: "2026-10-27",
      })
    ).toBe(5);
  });
});
