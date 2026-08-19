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
        <span>게임을 불러오고 있습니다</span>
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
      setError(e instanceof Error ? e.message : "처리하지 못했습니다. 잠시 후 다시 해 보세요.");
    }
  };
  if (created)
    return (
      <main className="entry">
        <h1>팀 참가 링크가 준비됐습니다</h1>
        <p className="lead">
          팀마다 맞는 링크를 보내 주세요. 지금 쓰는 기기에서는 세션 관리 화면을 엽니다.
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
          세션 관리 화면 열기
        </button>
      </main>
    );
  return (
    <main className="entry">
      {!path && <a className="example-back" href="/">← 예제 목록</a>}
      <h1 className="brand brand-title">
        <span>요일</span>
        <span>천재</span>
      </h1>
      <p className="lead">
        9초마다 정해진 요일을 누르면서
        <br />
        날짜 문제도 풀어 보세요.
      </p>
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
            <p className="supporting">2분 동안 9초 버튼과 날짜 문제를 혼자 해 봅니다. 연습 점수는 팀 순위에 나오지 않습니다.</p>
            <label>
              이름
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoFocus />
            </label>
            <button className="practice-start" onClick={act} disabled={!name.trim()}>혼자 연습 시작</button>
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
              팀별 시작 — 정원이 찬 팀부터 시작
            </label>
            <label>
              <input
                type="radio"
                checked={mode === "cohort"}
                onChange={() => setMode("cohort")}
              />{" "}
              전체 동시 시작 — 모든 팀이 준비되면 함께 시작
            </label>
          </fieldset>
          <button onClick={act} disabled={teams * capacity > 30}>
            세션 만들기
          </button>
          {teams * capacity > 30 && <p className="error" role="alert">참가자는 모두 30명까지 들어올 수 있습니다. 팀 수나 팀 정원을 줄여 주세요.</p>}
          </>}
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <footer>게임 구상 · 김창준 (June Kim)</footer>
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
    return <main className="loading">내 팀을 찾고 있습니다</main>;
  if (meTeam.phase === "finished")
    return <Debrief game={game} team={meTeam} events={session.events} kind={session.snapshot.config.kind} save={save} connection={connection} />;
  if (
    meTeam.phase === "lobby" ||
    meTeam.phase === "ready" ||
    meTeam.phase === "countdown"
  )
    return (
      <Lobby team={meTeam} capacity={teamConfig.capacity} socket={socket} practice={session.snapshot.config.kind === "solo_practice"} runMode={session.snapshot.config.runMode} />
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
  runMode,
}: {
  team: TeamState;
  capacity: number;
  socket: GameSocket | null;
  practice: boolean;
  runMode: "team" | "cohort";
}) {
  const count = Object.keys(team.members).length;
  return (
    <main className="entry">
      <div className="brand small">
        {count}
        <i>/{capacity}</i>
      </div>
      <h1>{practice ? "혼자 연습 준비" : "팀원을 기다리고 있습니다"}</h1>
      <ul className="roster">
        {Object.values(team.members).map((m) => (
          <li key={m.id}>{m.name}</li>
        ))}
      </ul>
      {count === capacity && team.phase === "lobby" && (
        <button onClick={() => socket?.command({ type: practice ? "practice.start" : "team.ready" })}>
          {practice ? "5초 뒤 연습 시작" : runMode === "team" ? "우리 팀 게임 시작" : "우리 팀 준비 완료"}
        </button>
      )}
      {team.phase === "ready" && runMode === "cohort" && (
        <p className="lead">우리 팀은 준비됐습니다. 다른 팀이 모두 준비되면 시작합니다.</p>
      )}
      {team.phase === "countdown" && <p className="countdown">곧 게임을 시작합니다</p>}
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
      {connection !== "authenticated" && <p className="connection" role="status">{connection === "failed" ? "실시간 연결이 끊겼습니다. 인터넷 연결을 확인해 주세요. 연결되면 게임이 자동으로 이어집니다." : "게임에 다시 연결하고 있습니다."}</p>}
      {team.phase === "paused" && (
        <p className="paused" role="status">
          게임이 잠시 멈췄습니다
        </p>
      )}
      <header>
        <span>{practice ? "혼자 연습" : `${Object.values(team.members).length}명`}</span>
        <strong>{credit} 크레딧</strong>
      </header>
      <section className="pulse" data-pressed={pressed}>
        <p>지금 누를 요일</p>
        <div className="day">
          {KO[due]}
          <span>{remain.toFixed(1)}</span>
        </div>
        <button
          className="duty"
          disabled={pressed || team.phase === "paused"}
          onClick={() => socket?.command({ type: "duty.press", weekday: due })}
        >
          {pressed ? KO[due] + "요일 완료" : KO[due] + "요일 누르기"}
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
              <label>날짜 범위<select
                value={range}
                onChange={(e) => setRange(e.target.value as RangeId)}
              >
                {RANGE_IDS.map((r) => (
                  <option key={r} value={r}>
                    {RANGES[r]}
                  </option>
                ))}
              </select></label>
              <label>제한 시간<select
                value={limit}
                onChange={(e) => setLimit(+e.target.value as TimeLimit)}
              >
                {TIME_LIMITS.map((t) => (
                  <option key={t} value={t}>
                    {t}초
                  </option>
                ))}
              </select></label>
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
              {RANGES[range]} · {limit}초 문제 풀기
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
      <h2>팀 순위 · 1인당 점수</h2>
      {projectLeaderboard(game).map((x) => (
        <div key={x.teamId}>
          <b>{x.rank}</b>
          <span>
            {x.label}
            <small>{x.rawCredits.toFixed(1)} 팀 합계</small>
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
      <h1>세션 관리</h1>
      <Scoreboard game={game} />
      <div className="host-actions">
        <button onClick={() => socket?.command({ type: "host.pause" })}>
          전체 일시정지
        </button>
        <button onClick={() => socket?.command({ type: "host.resume" })}>
          전체 재개
        </button>
        <button onClick={download}>사건 기록 내려받기</button>
        <button
          className="danger"
          onClick={() => socket?.command({ type: "host.end" })}
        >
          세션 종료
        </button>
      </div>
      <p>이 화면을 닫아도 게임 시간은 계속 흐릅니다.</p>
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
      <h1>{practice ? "2분 연습 결과" : "우리 팀 게임 결과"}</h1>
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
          <dt>문제 푸는 중 놓친 9초 버튼</dt>
          <dd>{evidence.challengeMissOverlaps}번</dd>
        </div>
        <div>
          <dt>마지막 1초에 맞힌 문제</dt>
          <dd>{evidence.nearDeadlineRecoveries}번</dd>
        </div>
        {Object.entries(evidence.challengeAttemptsByMember).map(
          ([id, count]) => (
            <div key={id}>
              <dt>{names[id]?.name ?? "팀원"}의 문제 풀이</dt>
              <dd>{count}번</dd>
            </div>
          ),
        )}
        {Object.entries(evidence.dutyMissesByMember).map(([id, count]) => (
          <div key={`miss-${id}`}>
            <dt>{names[id]?.name ?? "팀원"}이 놓친 9초 버튼</dt>
            <dd>{count}번</dd>
          </div>
        ))}
      </dl>
      {practice && <section className="readiness" aria-labelledby="readiness-title">
        <h2 id="readiness-title">사전 준비 확인</h2>
        <ul>
          <li data-ok={health}>서버 저장 상태</li>
          <li data-ok={connection === "authenticated"}>실시간 연결</li>
          <li data-ok={team.phase === "finished"}>서버 시간으로 2분 종료</li>
          <li data-ok={domainEvents.some((event) => event.type === "duty.window_settled")}>9초 버튼 기록</li>
          <li data-ok={domainEvents.some((event) => event.type === "challenge.resolved")}>요일 문제 기록</li>
        </ul>
        <p>다섯 항목이 모두 확인되면 사전 준비가 끝납니다.</p>
      </section>}
      <h2>최근 게임 기록</h2>
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
      ? `${event.missedMemberIds.map((id) => names[id]?.name ?? "팀원").join(", ")} 9초 버튼 놓침`
      : "모두 9초 버튼 누름";
  if (event.type === "challenge.started")
    return `${names[event.challenge.memberId]?.name ?? "팀원"} ${RANGES[event.challenge.rangeId]} · ${event.challenge.timeLimit}초 문제 풀기 시작`;
  if (event.type === "challenge.resolved")
    return `${names[event.memberId]?.name ?? "팀원"} 문제 ${event.outcome === "correct" ? "정답" : event.outcome === "wrong" ? "오답" : "시간 초과"}`;
  if (event.type === "team.paused") return "게임 일시정지";
  if (event.type === "team.resumed") return "게임 재개";
  if (event.type === "team.finished") return "게임 종료";
  if (event.type === "team.started") return "게임 시작";
  return "팀 게임 기록";
}
