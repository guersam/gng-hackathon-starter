import { useEffect, useState } from "react";
import type {
  GameEvent,
  GameState,
  RangeId,
  TeamState,
  TimeLimit,
  Weekday,
} from "../domain/types";
import {
  RANGE_IDS,
  SCORE_UNITS_PER_CREDIT,
  TIME_LIMITS,
  WEEKDAYS,
} from "../domain/types";
import {
  createSession,
  createPractice,
  GameSocket,
  joinSession,
  resumeSession,
  type ResumeEnvelope,
} from "./api";
import { projectDebrief, projectLeaderboard } from "../domain/projections";
import { activeElapsedMs } from "../domain/state";

const KO: Record<Weekday, string> = {
  monday: "월",
  tuesday: "화",
  wednesday: "수",
  thursday: "목",
  friday: "금",
  saturday: "토",
  sunday: "일",
};
const RANGES: Record<RangeId, string> = {
  this_week: "이번주",
  this_month: "이번달",
  this_year: "올해",
  recent_3_years: "최근 3년",
  recent_10_years: "최근 10년",
  recent_100_years: "최근 100년",
  recent_1000_years: "최근 1000년",
};
type Saved = { sessionId: string; capability: string };

export default function App() {
  const [saved, setSaved] = useState<Saved | null>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("yoil-genius:v2:identity") || "null",
      );
    } catch {
      return null;
    }
  });
  const [session, setSession] = useState<ResumeEnvelope | null>(null);
  const [socket, setSocket] = useState<GameSocket | null>(null);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState<"connecting" | "authenticated" | "reconnecting" | "failed">("connecting");
  useEffect(() => {
    if (!saved) return;
    resumeSession(saved.sessionId, saved.capability)
      .then(setSession)
      .catch(() => setSaved(null));
  }, [saved]);
  useEffect(() => {
    if (!saved || !session) return;
    const s = new GameSocket(
      saved.sessionId,
      saved.capability,
      (snapshot, events) =>
        setSession((prev) =>
          prev
            ? {
                ...prev,
                snapshot: snapshot as ResumeEnvelope["snapshot"],
                events: events ?? prev.events,
              }
            : prev,
        ),
      setError,
      setConnection,
    );
    s.connect();
    setSocket(s);
    return () => s.close();
  }, [saved?.sessionId, session?.participantId]);
  const save = (value: Saved) => {
    localStorage.setItem("yoil-genius:v2:identity", JSON.stringify(value));
    setSaved(value);
  };
  if (!saved) return <Entry save={save} error={error} setError={setError} />;
  if (!session)
    return (
      <main className="loading">
        <span>요일을 모으는 중</span>
      </main>
    );
  return <Game session={session} socket={socket} error={error} save={save} connection={connection} />;
}

function Entry({
  save,
  error,
  setError,
}: {
  save: (s: Saved) => void;
  error: string;
  setError: (s: string) => void;
}) {
  const path = location.pathname.match(/^\/join\/([^/]+)\/([^/]+)$/);
  const [name, setName] = useState("");
  const [teams, setTeams] = useState(2);
  const [capacity, setCapacity] = useState(4);
  const [mode, setMode] = useState<"team" | "cohort">("team");
  const [entryMode, setEntryMode] = useState<"practice" | "session">("practice");
  const [created, setCreated] = useState<{
    sessionId: string;
    hostCapability: string;
    teams: Array<{ label: string; joinPath: string }>;
  } | null>(null);
  const act = async () => {
    try {
      setError("");
      if (path) {
        const x = await joinSession(path[1], path[2], name);
        save({ sessionId: x.sessionId, capability: x.capability });
      } else if (entryMode === "practice") {
        const x = await createPractice(name);
        save({ sessionId: x.sessionId, capability: x.capability });
      } else {
        const x = await createSession(teams, capacity, mode);
        setCreated(x);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 났습니다.");
    }
  };
  if (created)
    return (
      <main className="entry">
        <h1>팀으로 가는 길</h1>
        <p className="lead">
          링크를 팀별로 나눠 주세요. 호스트 화면은 이 기기에 보관됩니다.
        </p>
        <div className="links">
          {created.teams.map((t) => (
            <a key={t.joinPath} href={t.joinPath}>
              {t.label}
              <small>
                {location.origin}
                {t.joinPath}
              </small>
            </a>
          ))}
        </div>
        <button
          onClick={() =>
            save({
              sessionId: created.sessionId,
              capability: created.hostCapability,
            })
          }
        >
          호스트 화면 열기
        </button>
      </main>
    );
  return (
    <main className="entry">
      <div className="brand">
        요일
        <br />
        천재
      </div>
      <p className="lead">
        9초의 공동 리듬 사이로
        <br />
        날짜의 요일을 맞혀 보세요.
      </p>
      {!path && <nav className="game-links" aria-label="다른 기준 게임"><a href="/handoff">Handoff Lab 플레이</a><a href="/workshop">빈 게임 팩 열기</a></nav>}
      {path ? (
        <>
          <label>
            이름
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              autoFocus
            />
          </label>
          <button onClick={act} disabled={!name.trim()}>
            팀에 들어가기
          </button>
        </>
      ) : (
        <>
          <div className="entry-choice" role="group" aria-label="시작 방법">
            <button className={entryMode === "practice" ? "selected" : "secondary"} onClick={() => setEntryMode("practice")}>혼자 2분 연습</button>
            <button className={entryMode === "session" ? "selected" : "secondary"} onClick={() => setEntryMode("session")}>팀 세션 만들기</button>
          </div>
          {entryMode === "practice" ? <>
            <p className="supporting">내 배포의 실시간 연결과 실제 게임 규칙을 혼자 확인합니다. 팀 순위에는 들어가지 않습니다.</p>
            <label>
              이름
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoFocus />
            </label>
            <button className="practice-start" onClick={act} disabled={!name.trim()}>비공개 연습 만들기</button>
          </> : <><div className="split">
            <label>
              팀 수
              <input
                type="number"
                min="1"
                max="10"
                value={teams}
                onChange={(e) => setTeams(+e.target.value)}
              />
            </label>
            <label>
              팀 정원
              <select
                value={capacity}
                onChange={(e) => setCapacity(+e.target.value)}
              >
                <option>3</option>
                <option>4</option>
                <option>5</option>
              </select>
            </label>
          </div>
          <fieldset>
            <legend>시작 방식</legend>
            <label>
              <input
                type="radio"
                checked={mode === "team"}
                onChange={() => setMode("team")}
              />{" "}
              팀별 시작
            </label>
            <label>
              <input
                type="radio"
                checked={mode === "cohort"}
                onChange={() => setMode("cohort")}
              />{" "}
              전체 동시 시작
            </label>
          </fieldset>
          <button onClick={act} disabled={teams * capacity > 30}>
            세션 만들기
          </button>
          </>}
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <footer>게임 구상 도움 · 김창준 (June Kim)</footer>
    </main>
  );
}

function Game({
  session,
  socket,
  error,
  save,
  connection,
}: {
  session: ResumeEnvelope;
  socket: GameSocket | null;
  error: string;
  save: (s: Saved) => void;
  connection: "connecting" | "authenticated" | "reconnecting" | "failed";
}) {
  const game = session.snapshot.game;
  const meTeam = session.teamId ? game.teams[session.teamId] : null;
  const teamConfig = session.snapshot.config.teams.find(
    (t) => t.id === session.teamId,
  );
  const isHost = session.role === "host";
  if (isHost) return <Host session={session} socket={socket} />;
  if (!meTeam || !teamConfig)
    return <main className="loading">팀을 찾는 중</main>;
  if (meTeam.phase === "finished")
    return <Debrief game={game} team={meTeam} events={session.events} kind={session.snapshot.config.kind} save={save} connection={connection} />;
  if (
    meTeam.phase === "lobby" ||
    meTeam.phase === "ready" ||
    meTeam.phase === "countdown"
  )
    return (
      <Lobby team={meTeam} capacity={teamConfig.capacity} socket={socket} practice={session.snapshot.config.kind === "solo_practice"} />
    );
  return (
    <Play
      game={game}
      team={meTeam}
      memberId={session.participantId}
      socket={socket}
      error={error}
      practice={session.snapshot.config.kind === "solo_practice"}
      connection={connection}
    />
  );
}

function Lobby({
  team,
  capacity,
  socket,
  practice,
}: {
  team: TeamState;
  capacity: number;
  socket: GameSocket | null;
  practice: boolean;
}) {
  const count = Object.keys(team.members).length;
  return (
    <main className="entry">
      <div className="brand small">
        {count}
        <i>/{capacity}</i>
      </div>
      <h1>{practice ? "혼자 연습 준비" : "팀원이 모이는 중"}</h1>
      <ul className="roster">
        {Object.values(team.members).map((m) => (
          <li key={m.id}>{m.name}</li>
        ))}
      </ul>
      {count === capacity && team.phase === "lobby" && (
        <button onClick={() => socket?.command({ type: practice ? "practice.start" : "team.ready" })}>
          {practice ? "5초 뒤 연습 시작" : "우리 팀 준비 완료"}
        </button>
      )}
      {team.phase === "ready" && (
        <p className="lead">다른 팀을 기다리고 있어요.</p>
      )}
      {team.phase === "countdown" && <p className="countdown">곧 시작합니다</p>}
    </main>
  );
}

function Play({
  game,
  team,
  memberId,
  socket,
  error,
  practice,
  connection,
}: {
  game: GameState;
  team: TeamState;
  memberId: string;
  socket: GameSocket | null;
  error: string;
  practice: boolean;
  connection: "connecting" | "authenticated" | "reconnecting" | "failed";
}) {
  const [now, setNow] = useState(Date.now());
  const [range, setRange] = useState<RangeId>("this_year");
  const [limit, setLimit] = useState<TimeLimit>(9);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const active = activeElapsedMs(team, now);
  const window = Math.floor(active / 9000);
  const due = WEEKDAYS[window % 7];
  const remain = Math.max(0, 9 - (active % 9000) / 1000);
  const pressed = team.presses[window]?.includes(memberId);
  const challenge = Object.values(team.challenges).find(
    (c) => c.memberId === memberId,
  );
  const credit = (team.scoreUnits / SCORE_UNITS_PER_CREDIT).toFixed(1);
  return (
    <main className="game" aria-busy={team.phase === "paused"}>
      {connection !== "authenticated" && <p className="connection" role="status">{connection === "failed" ? "연결을 확인해 주세요" : "실시간 연결을 복구하는 중"}</p>}
      {team.phase === "paused" && (
        <p className="paused" role="status">
          호스트가 시간을 멈췄습니다
        </p>
      )}
      <header>
        <span>{practice ? "혼자 연습" : `${Object.values(team.members).length}명`}</span>
        <strong>{credit} 크레딧</strong>
      </header>
      <section className="pulse" data-pressed={pressed}>
        <p>지금 눌러야 할 요일</p>
        <div className="day">
          {KO[due]}
          <span>{remain.toFixed(1)}</span>
        </div>
        <button
          className="duty"
          disabled={pressed || team.phase === "paused"}
          onClick={() => socket?.command({ type: "duty.press", weekday: due })}
        >
          {pressed ? "완료" : "내 몫 누르기"}
        </button>
        {!practice && <div className="people">
          {Object.values(team.members).map((m) => (
            <span
              className={team.presses[window]?.includes(m.id) ? "done" : ""}
              key={m.id}
            >
              {m.name}
            </span>
          ))}
        </div>}
      </section>
      <section className="challenge">
        <h2>요일 문제</h2>
        {challenge ? (
          <>
            <time>
              {Math.max(
                0,
                (challenge.deadlineActiveMs - active) / 1000,
              ).toFixed(1)}
              초
            </time>
            <div className="date">
              {challenge.date.year}. {challenge.date.month}.{" "}
              {challenge.date.day}.
            </div>
            <div className="weekdays">
              {WEEKDAYS.map((w) => (
                <button
                  key={w}
                  onClick={() =>
                    socket?.command({
                      type: "challenge.answer",
                      challengeId: challenge.id,
                      weekday: w,
                    })
                  }
                >
                  {KO[w]}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="pickers">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as RangeId)}
              >
                {RANGE_IDS.map((r) => (
                  <option key={r} value={r}>
                    {RANGES[r]}
                  </option>
                ))}
              </select>
              <select
                value={limit}
                onChange={(e) => setLimit(+e.target.value as TimeLimit)}
              >
                {TIME_LIMITS.map((t) => (
                  <option key={t} value={t}>
                    {t}초
                  </option>
                ))}
              </select>
            </div>
            <button
              className="secondary"
              onClick={() =>
                socket?.command({
                  type: "challenge.start",
                  rangeId: range,
                  timeLimit: limit,
                })
              }
            >
              문제 받기
            </button>
          </>
        )}
      </section>
      {!practice && <Scoreboard game={game} />}
      {error && (
        <p className="toast" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}

function Scoreboard({ game }: { game: GameState }) {
  return (
    <section className="scoreboard">
      <h2>모든 팀 · 1인당</h2>
      {projectLeaderboard(game).map((x) => (
        <div key={x.teamId}>
          <b>{x.rank}</b>
          <span>
            {x.label}
            <small>{x.rawCredits.toFixed(1)} 원점수</small>
          </span>
          <strong>
            {Number.isFinite(x.unitsPerMember)
              ? (x.unitsPerMember / SCORE_UNITS_PER_CREDIT).toFixed(1)
              : "—"}
          </strong>
        </div>
      ))}
    </section>
  );
}
function Host({
  session,
  socket,
}: {
  session: ResumeEnvelope;
  socket: GameSocket | null;
}) {
  const game = session.snapshot.game;
  const download = async () => {
    const saved = JSON.parse(
      localStorage.getItem("yoil-genius:v2:identity") || "null",
    ) as Saved | null;
    if (!saved) return;
    const response = await fetch(`/api/sessions/${saved.sessionId}/export`, {
      headers: { authorization: `Bearer ${saved.capability}` },
    });
    if (!response.ok) throw new Error("사건 기록을 내려받지 못했습니다.");
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `yoil-genius-${saved.sessionId}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <main className="host">
      <h1>세션의 흐름</h1>
      <Scoreboard game={game} />
      <div className="host-actions">
        <button onClick={() => socket?.command({ type: "host.pause" })}>
          전체 멈춤
        </button>
        <button onClick={() => socket?.command({ type: "host.resume" })}>
          다시 흐르기
        </button>
        <button onClick={download}>사건 기록 내려받기</button>
        <button
          className="danger"
          onClick={() => socket?.command({ type: "host.end" })}
        >
          세션 끝내기
        </button>
      </div>
      <p>호스트 화면을 닫아도 팀의 시계는 계속 흐릅니다.</p>
    </main>
  );
}
function Debrief({
  game,
  team,
  events,
  kind,
  save,
  connection,
}: {
  game: GameState;
  team: TeamState;
  events: Array<{ payload: Record<string, unknown> }>;
  kind: GameState["config"]["kind"];
  save: (s: Saved) => void;
  connection: "connecting" | "authenticated" | "reconnecting" | "failed";
}) {
  const domainEvents = events
    .map((event) => event.payload)
    .filter(
      (payload) =>
        typeof payload.type === "string" && payload.schemaVersion === 1,
    ) as unknown as GameEvent[];
  const evidence = projectDebrief(domainEvents, team.id, kind);
  const practice = kind === "solo_practice";
  const [health, setHealth] = useState(false);
  useEffect(() => { if (practice) void fetch("/api/health").then((r) => r.json() as Promise<{ ok?: boolean; schemaVersion?: string }>).then((x) => setHealth(x.ok === true && x.schemaVersion === "yoil-genius:v2")).catch(() => setHealth(false)); }, [practice]);
  const names = team.members;
  const timeline = domainEvents
    .filter((event) => "teamId" in event && event.teamId === team.id)
    .slice(-16);
  return (
    <main className="debrief">
      <div className="brand small">끝</div>
      <h1>{practice ? "내가 지나온 2분" : "우리 팀이 만든 리듬"}</h1>
      <p className="lead">
        최종 원점수 {(team.scoreUnits / SCORE_UNITS_PER_CREDIT).toFixed(1)} ·
        {!practice && <>1인당{" "}
        {(
          team.scoreUnits /
          SCORE_UNITS_PER_CREDIT /
          (team.rosterSize || 1)
        ).toFixed(1)}</>}
      </p>
      <dl className="evidence">
        <div>
          <dt>도전 중 의무 누락</dt>
          <dd>{evidence.challengeMissOverlaps}번</dd>
        </div>
        <div>
          <dt>마감 직전 회복</dt>
          <dd>{evidence.nearDeadlineRecoveries}번</dd>
        </div>
        {Object.entries(evidence.challengeAttemptsByMember).map(
          ([id, count]) => (
            <div key={id}>
              <dt>{names[id]?.name ?? "팀원"}의 도전</dt>
              <dd>{count}번</dd>
            </div>
          ),
        )}
        {Object.entries(evidence.dutyMissesByMember).map(([id, count]) => (
          <div key={`miss-${id}`}>
            <dt>{names[id]?.name ?? "팀원"}의 의무 누락</dt>
            <dd>{count}번</dd>
          </div>
        ))}
      </dl>
      {practice && <section className="readiness" aria-labelledby="readiness-title">
        <h2 id="readiness-title">사전 준비 확인</h2>
        <ul>
          <li data-ok={health}>배포 저장소 상태</li>
          <li data-ok={connection === "authenticated"}>인증된 실시간 연결</li>
          <li data-ok={team.phase === "finished"}>서버 권위로 2분 종료</li>
          <li data-ok={domainEvents.some((event) => event.type === "duty.window_settled")}>9초 의무 기록 저장</li>
          <li data-ok={domainEvents.some((event) => event.type === "challenge.resolved")}>요일 문제 결과 저장</li>
        </ul>
        <p>이 목록은 이 브라우저의 자기 점검이며 수료 인증서가 아닙니다.</p>
      </section>}
      <h2>마지막 사건의 흐름</h2>
      <ol className="timeline">
        {timeline.map((event, index) => (
          <li key={`${event.atMs}-${index}`}>
            <time>
              {new Date(event.atMs).toLocaleTimeString("ko-KR", {
                minute: "2-digit",
                second: "2-digit",
              })}
            </time>
            <span>{eventLabel(event, names)}</span>
          </li>
        ))}
      </ol>
      <ol>
        {evidence.prompts.map((prompt) => (
          <li key={prompt}>{prompt}</li>
        ))}
      </ol>
      {!practice && <Scoreboard game={game} />}
      {practice && <button onClick={async () => { const name = Object.values(team.members)[0]?.name || "연습자"; const next = await createPractice(name); save({ sessionId: next.sessionId, capability: next.capability }); }}>다시 2분 연습</button>}
    </main>
  );
}

function eventLabel(event: GameEvent, names: TeamState["members"]): string {
  if (event.type === "duty.window_settled")
    return event.missedMemberIds.length
      ? `${event.missedMemberIds.map((id) => names[id]?.name ?? "팀원").join(", ")} 의무 누락`
      : "모두 의무 완료";
  if (event.type === "challenge.started")
    return `${names[event.challenge.memberId]?.name ?? "팀원"} ${RANGES[event.challenge.rangeId]} · ${event.challenge.timeLimit}초 문제 시작`;
  if (event.type === "challenge.resolved")
    return `${names[event.memberId]?.name ?? "팀원"} 문제 ${event.outcome === "correct" ? "정답" : event.outcome === "wrong" ? "오답" : "시간 초과"}`;
  if (event.type === "team.paused") return "팀 시계 멈춤";
  if (event.type === "team.resumed") return "팀 시계 재개";
  if (event.type === "team.finished") return "플레이 종료";
  if (event.type === "team.started") return "플레이 시작";
  return "팀 행동 기록";
}
