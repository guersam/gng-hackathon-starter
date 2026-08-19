import { useState } from "react";
import { createHandoffState, decideHandoff, foldHandoff, projectHandoff, type GroupId, type HandoffAction, type Phase, type Tile } from "./domain";

const PHASE: Record<Phase, { step: string; title: string }> = {
  build: { step: "1/4", title: "비밀 모양 만들기" },
  document: { step: "2/4", title: "만든 모양 설명하기" },
  reconstruct: { step: "3/4", title: "설명만 보고 만들기" },
  compare: { step: "4/4", title: "원본과 비교하기" },
};
const TILE: Tile[] = ["empty", "ink", "acid"];
const TILE_KO: Record<Tile, string> = { empty: "흰색", ink: "검정", acid: "노랑" };
const OTHER: Record<GroupId, GroupId> = { a: "b", b: "a" };

export function HandoffLab() {
  const [state, setState] = useState(createHandoffState);
  const [group, setGroup] = useState<GroupId>("a");
  const view = projectHandoff(state, group);
  const other = OTHER[group];
  const saved = state.ready.includes(group);
  const act = (action: HandoffAction) => {
    const decision = decideHandoff(state, action);
    if (!decision.ok) return;
    const next = decision.events.reduce(foldHandoff, state);
    setState(next);
    if (action.type === "group.ready") setGroup(next.phase === state.phase ? OTHER[action.group] : "a");
  };
  const editableBoard = state.phase === "build" ? view.ownOriginal : state.phase === "reconstruct" ? view.ownReconstruction : undefined;
  const actionLabel = state.phase === "build" ? `${group.toUpperCase()} 그룹 모양 저장` : state.phase === "document" ? `${group.toUpperCase()} 그룹 설명 저장` : `${group.toUpperCase()} 그룹이 다시 만든 모양 저장`;

  return <main className="handoff">
    <a href="/">← 예제 목록</a>
    <h1>Handoff<br/>Lab</h1>
    <p className="lead">두 그룹이 한 기기를 번갈아 씁니다.<br/>한쪽이 만든 모양을 글로 설명하고, 다른 쪽이 그 글만 보고 다시 만듭니다.</p>

    {state.phase !== "compare" && <div className="group-switch" role="group" aria-label="화면을 볼 그룹 선택">
      {(["a", "b"] as const).map((id) => <button key={id} className={group === id ? "selected" : "secondary"} aria-pressed={group === id} onClick={() => setGroup(id)}>{id.toUpperCase()} 그룹 화면 보기</button>)}
    </div>}

    <section className="handoff-stage" aria-labelledby="handoff-stage-title">
      <p className="step">{PHASE[state.phase].step} 단계</p>
      <h2 id="handoff-stage-title">{PHASE[state.phase].title}</h2>

      {state.phase === "build" && <>
        <p><strong>{group.toUpperCase()} 그룹만 화면을 보세요.</strong> 9칸을 눌러 흰색·검정·노랑으로 모양을 만드세요. 상대 그룹에는 보여주지 마세요.</p>
        <Board tiles={editableBoard!} editable={!saved} onSet={(index, tile) => act({ type: "tile.set", group, target: "original", index, tile })}/>
      </>}

      {state.phase === "document" && <>
        <p><strong>{group.toUpperCase()} 그룹만 화면을 보세요.</strong> 아래 원본은 상대에게 보여주지 마세요. 글만 읽고도 다시 만들 수 있게 설명하세요.</p>
        <h3>{group.toUpperCase()} 그룹의 원본</h3>
        <Board tiles={view.ownOriginal!}/>
        <label className="document-label" htmlFor={`document-${group}`}>상대 그룹에게 건넬 설명</label>
        <textarea id={`document-${group}`} maxLength={120} value={state.documents[group]} disabled={saved} onChange={(event) => act({ type: "document.set", group, text: event.target.value })}/>
        <small>{state.documents[group].length}/120자</small>
      </>}

      {state.phase === "reconstruct" && <>
        <p><strong>{group.toUpperCase()} 그룹만 화면을 보세요.</strong> {other.toUpperCase()} 그룹의 원본은 보지 마세요. 아래 설명만 읽고 같은 모양을 만드세요.</p>
        <h3>{other.toUpperCase()} 그룹이 남긴 설명</h3>
        <blockquote>{view.receivedDocument || "설명이 없습니다. 설명 없이 만들어 보세요."}</blockquote>
        <h3>{group.toUpperCase()} 그룹이 다시 만든 모양</h3>
        <Board tiles={editableBoard!} editable={!saved} onSet={(index, tile) => act({ type: "tile.set", group, target: "reconstruction", index, tile })}/>
      </>}

      {state.phase === "compare" && <>
        <p>설명만 보고 만든 모양을 원본과 나란히 비교해 보세요.</p>
        {(["a", "b"] as const).map((id) => {
          const result = projectHandoff(state, id);
          const source = OTHER[id];
          return <div className="comparison-pair" key={id}>
            <h3>{id.toUpperCase()} 그룹이 다시 만든 {source.toUpperCase()} 그룹의 원본 모양</h3>
            <div className="compare"><div><h4>{source.toUpperCase()} 그룹 원본</h4><Board tiles={result.revealedOriginal!}/></div><div><h4>{id.toUpperCase()} 그룹이 다시 만든 모양</h4><Board tiles={result.ownReconstruction!}/></div></div>
          </div>;
        })}
      </>}

      {state.phase !== "compare" && <>
        <button disabled={saved} onClick={() => act({ type: "group.ready", group })}>{saved ? `${group.toUpperCase()} 그룹 저장 완료` : actionLabel}</button>
        <p className="handoff-next" role="status">{state.ready.length === 0 ? "저장하면 다른 그룹 차례입니다." : `${state.ready[0].toUpperCase()} 그룹 저장 완료. 이제 ${group.toUpperCase()} 그룹 차례입니다.`}</p>
      </>}
    </section>

    {state.phase === "compare" && <section className="handoff-reflect"><h2>바로 고치지 말고 먼저 이야기해 보세요</h2><ol><li>같은 설명을 다르게 이해한 곳은 어디였나요?</li><li>만든 사람에게는 당연해서 쓰지 않은 것은 무엇이었나요?</li><li>다시 만든 사람이 새로 알아낸 기준은 무엇이었나요?</li></ol><button onClick={() => { setState(createHandoffState()); setGroup("a"); }}>처음부터 다시 하기</button></section>}
    <footer>Gerald M. Weinberg가 공개한 “Tinkering With Toys”에서 영감을 얻어 만든 웹 게임</footer>
  </main>;
}

function Board({ tiles, editable = false, onSet }: { tiles: Tile[]; editable?: boolean; onSet?: (index: number, tile: Tile) => void }) {
  return <div className="tile-board">{tiles.map((tile, index) => <button key={index} type="button" disabled={!editable} data-tile={tile} aria-label={`${index + 1}번 칸, ${TILE_KO[tile]}${editable ? ", 누르면 색상 변경" : ""}`} onClick={() => onSet?.(index, TILE[(TILE.indexOf(tile) + 1) % TILE.length])}/>)}</div>;
}
