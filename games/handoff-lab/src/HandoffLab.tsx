import { useState } from "react";
import { createHandoffState, decideHandoff, foldHandoff, projectHandoff, type GroupId, type HandoffAction, type Tile } from "./domain";

const PHASE = { build: "구조 만들기", document: "문서 남기기", reconstruct: "문서로 재구성", compare: "원본과 비교" } as const;
const TILE: Tile[] = ["empty", "ink", "acid"];

export function HandoffLab() {
  const [state, setState] = useState(createHandoffState);
  const [group, setGroup] = useState<GroupId>("a");
  const view = projectHandoff(state, group);
  const act = (action: HandoffAction) => {
    const decision = decideHandoff(state, action);
    if (decision.ok) setState(decision.events.reduce(foldHandoff, state));
  };
  const board = state.phase === "build" ? view.ownOriginal : view.ownReconstruction;
  return <main className="handoff">
    <a href="/">← 예제 목록</a>
    <p className="eyebrow">TURN-BASED EXPERIENCE</p>
    <h1>Handoff<br/>Lab</h1>
    <p className="lead">만든 것은 넘길 수 있을까요?<br/>설명한 것은 다시 만들 수 있을까요?</p>
    <div className="group-switch" role="group" aria-label="현재 그룹">
      {(["a", "b"] as const).map((id) => <button key={id} className={group === id ? "selected" : "secondary"} onClick={() => setGroup(id)}>{id.toUpperCase()} 그룹</button>)}
    </div>
    <section className="handoff-stage">
      <small>현재 단계</small><h2>{PHASE[state.phase]}</h2>
      {state.phase === "build" && <p>다른 그룹이 보지 않게 3×3 구조를 만드세요. 칸을 눌러 재료를 바꿉니다.</p>}
      {state.phase === "document" && <><p>그림이나 원본 공유 없이, 다음 그룹이 다시 만들 수 있도록 120자로 설명하세요.</p><textarea maxLength={120} value={state.documents[group]} onChange={(event) => act({ type: "document.set", group, text: event.target.value })}/><small>{state.documents[group].length}/120</small></>}
      {state.phase === "reconstruct" && <blockquote>{view.receivedDocument || "상대 그룹의 문서가 비어 있습니다."}</blockquote>}
      {board && state.phase !== "document" && (
        <Board
          tiles={board}
          editable={state.phase !== "compare"}
          onSet={(index, tile) => act({
            type: "tile.set",
            group,
            target: state.phase === "build" ? "original" : "reconstruction",
            index,
            tile,
          })}
        />
      )}
      {state.phase === "compare" && <div className="compare"><div><h3>받은 원본</h3><Board tiles={view.revealedOriginal!}/></div><div><h3>우리의 재구성</h3><Board tiles={view.ownReconstruction!}/></div></div>}
      {state.phase !== "compare" && <button disabled={state.ready.includes(group)} onClick={() => act({ type: "group.ready", group })}>{state.ready.includes(group) ? "다른 그룹을 기다리는 중" : "이 단계 준비 완료"}</button>}
    </section>
    {state.phase === "compare" && <section className="handoff-reflect"><h2>차이를 고치기 전에 읽기</h2><ol><li>문서에 있었지만 다르게 해석한 것은 무엇인가?</li><li>만든 사람에게는 당연해서 기록하지 않은 것은 무엇인가?</li><li>다시 만든 사람이 새로 발견한 설계 기준은 무엇인가?</li></ol><button onClick={() => setState(createHandoffState())}>새 교환 시작</button></section>}
    <footer>Weinberg의 공개된 “Tinkering With Toys” 메커니즘에서 영감받은 독자적 웹 실험</footer>
  </main>;
}

function Board({ tiles, editable = false, onSet }: { tiles: Tile[]; editable?: boolean; onSet?: (index: number, tile: Tile) => void }) {
  return <div className="tile-board">{tiles.map((tile, index) => <button key={index} disabled={!editable} data-tile={tile} aria-label={`${index + 1}번 칸 ${tile}`} onClick={() => onSet?.(index, TILE[(TILE.indexOf(tile) + 1) % TILE.length])}/>)}</div>;
}
