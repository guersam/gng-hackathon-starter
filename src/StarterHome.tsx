export function StarterHome() {
  return (
    <main className="starter-home">
      <header>
        <h1>
          <span>두 게임을 먼저</span>
          <span>해 보세요.</span>
        </h1>
        <p className="lead">만들고 싶은 게임과 가까운 쪽을 골라서 바꿔 보세요. 원본을 남기고 싶다면 복사해서 새 게임을 만들 수도 있습니다.</p>
      </header>
      <section className="starter-games" aria-label="기준 게임 선택">
        <a href="/yoil" className="starter-game">
          <span>여러 기기로 하는 팀 게임</span>
          <h2>요일 천재</h2>
          <p>여러 휴대전화로 함께하는 게임입니다. 9초마다 정해진 요일을 누르면서 날짜 문제를 풉니다.</p>
          <strong>게임 해 보기 →</strong>
        </a>
        <a href="/handoff" className="starter-game">
          <span>한 기기로 하는 팀 게임</span>
          <h2>Handoff Lab</h2>
          <p>두 그룹이 한 기기를 번갈아 씁니다. 한쪽이 만든 모양을 글로 설명하고, 다른 쪽이 다시 만듭니다.</p>
          <strong>게임 해 보기 →</strong>
        </a>
      </section>
      <section className="starter-steps" aria-labelledby="starter-steps-title">
        <h2 id="starter-steps-title">게임 만드는 순서</h2>
        <ol>
          <li>팀원 모두가 두 게임을 해 봅니다.</li>
          <li>만들 게임과 가까운 쪽을 고릅니다.</li>
          <li>규칙 하나만 바꾼 뒤 다시 해 봅니다.</li>
        </ol>
      </section>
    </main>
  );
}
