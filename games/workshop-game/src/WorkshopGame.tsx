import { useState } from "react";
import { createWorkshopState, decideWorkshop, foldWorkshop, type Choice, type WorkshopAction } from "./domain";

export function WorkshopGame() {
  const [names, setNames] = useState("민지, 준, 서연, 현우");
  const [state, setState] = useState(createWorkshopState);
  const people = names.split(",").map((name) => name.trim()).filter(Boolean).slice(0, 30);
  const act = (action: WorkshopAction) => {
    const decision = decideWorkshop(state, action);
    if (decision.ok) setState(decision.events.reduce(foldWorkshop, state));
  };
  const count = (choice: Choice) => Object.values(state.choices).filter((value) => value === choice).length;
  return <main className="workshop-game">
    <nav><a href="/">요일 천재</a><a href="/handoff">Handoff Lab</a></nav>
    <h1>한 문장.<br/>두 선택.</h1>
    <p className="lead">코더 한 명을 기다리지 않고, 팀 전원이 먼저 규칙을 플레이하는 최소 게임 팩입니다.</p>
    <label>참가자 이름 (쉼표로 구분)<input value={names} onChange={(event) => setNames(event.target.value)} /></label>
    <section className="choice-stage">
      <h2>{state.prompt}</h2>
      <div className="choice-people">{people.map((person) => <div key={person}><b>{person}</b><button disabled={Boolean(state.choices[person])} onClick={() => act({ type: "choice.submit", participantId: person, choice: "left" })}>빨리 내놓기</button><button disabled={Boolean(state.choices[person])} onClick={() => act({ type: "choice.submit", participantId: person, choice: "right" })}>실패 조건 합의</button></div>)}</div>
      {!state.revealed ? <button className="reveal" disabled={!Object.keys(state.choices).length} onClick={() => act({ type: "result.reveal" })}>선택 공개</button> : <div className="choice-result" role="status"><strong>{count("left")}</strong><span>빨리 내놓기</span><strong>{count("right")}</strong><span>실패 조건 합의</span></div>}
    </section>
    <section className="change-map"><h2>팀이 바꿀 세 곳</h2><ol><li><code>prompt</code> — 어떤 긴장을 경험하게 할지</li><li><code>Choice</code> — 어떤 행동이 가능할지</li><li><code>foldWorkshop</code> — 선택이 어떤 결과를 만들지</li></ol></section>
  </main>;
}
