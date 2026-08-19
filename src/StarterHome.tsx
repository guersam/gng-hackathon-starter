export function StarterHome() {
  return (
    <main className="starter-home">
      <header>
        <h1>먼저 플레이하고,<br />기존 게임을 깨뜨리세요.</h1>
        <p className="lead">가까운 예제를 고른 뒤 그대로 바꾸거나, 복사해 새 게임으로 시작하세요. 어느 쪽이든 플레이 가능한 전체에서 출발합니다.</p>
      </header>
      <section className="starter-games" aria-label="기준 게임 선택">
        <a href="/yoil" className="starter-game">
          <span>실시간 팀 시뮬레이션</span>
          <h2>요일 천재</h2>
          <p>서버 시간, WebSocket, 팀 점수와 사건 기록까지 바꾸고 싶을 때 시작합니다.</p>
          <strong>플레이하기 →</strong>
        </a>
        <a href="/handoff" className="starter-game">
          <span>한 기기 턴제 시뮬레이션</span>
          <h2>Handoff Lab</h2>
          <p>상태, 행동과 결과를 빠르게 바꾸고 팀이 바로 다시 플레이하게 할 때 시작합니다.</p>
          <strong>플레이하기 →</strong>
        </a>
      </section>
      <section className="starter-steps" aria-labelledby="starter-steps-title">
        <h2 id="starter-steps-title">바꾸는 순서</h2>
        <ol>
          <li>팀 전원이 원본을 한 번 플레이합니다.</li>
          <li>더 가까운 게임을 직접 바꿀지, 복사해 새 게임을 만들지 고릅니다.</li>
          <li>한 규칙만 바꾸고 같은 배포 주소에서 다시 플레이합니다.</li>
        </ol>
      </section>
    </main>
  );
}
