# 사전 배포 확인과 문제 해결

## 완료 기준

- 본인 Cloudflare 계정으로 배포했다.
- `pnpm check`와 `pnpm smoke -- <배포 주소>`가 성공했다.
- 배포 화면의 `혼자 2분 연습`에서 의무 입력, 문제 응답과 개인 점수를 확인했다.
- 연습 중 새로고침해 같은 참가자로 복구하고 종료 화면의 준비 확인을 읽었다.
- 저장소의 정확한 커밋과 공개 배포 주소를 기록했다.

## 처음부터 다시 확인

```bash
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm check
pnpm test:browser
pnpm exec wrangler whoami
pnpm deploy
pnpm smoke -- https://내-배포-주소.workers.dev
```

Node.js는 22 이상을 사용한다. `wrangler whoami`가 다른 계정을 가리키면 `pnpm exec wrangler logout` 뒤 `pnpm exec wrangler login`으로 본인 계정을 다시 승인한다. 토큰, 쿠키, 계정 식별자 또는 배포 권한을 채팅이나 저장소에 올리지 않는다.

## 증상별 확인

### 설치 또는 검사 실패

저장소 루트에서 실행했는지, Node.js 버전과 잠금 파일이 맞는지 확인한다. 잠금 파일을 임의로 삭제하거나 의존성 버전을 현장에서 넓히지 않는다. 오류 전문과 `node --version`, 현재 커밋을 함께 남긴다.

### 배포는 되었지만 상태 점검 실패

배포 출력의 주소와 smoke 입력 주소가 같은지 확인한다. 상태 점검은 프로토콜·스키마 버전과 SQLite Durable Object 준비 상태를 확인해야 하며 메모리 대체 모드로 성공해서는 안 된다. 배포 로그에서 마이그레이션 또는 바인딩 오류를 먼저 찾는다.

### 화면은 열리지만 실시간 갱신 실패

개발자 도구에서 WebSocket 연결과 첫 인증 응답을 확인한다. 행사장 네트워크에서 막히는지 휴대전화 통신망으로 한 번 비교한다. 권한 값을 URL, 캡처 또는 로그에 노출하지 않는다.

### 무료 제공량 또는 계정 제한 문제

[공식 요금 문서](https://developers.cloudflare.com/workers/platform/pricing/)와 [Durable Objects 제한](https://developers.cloudflare.com/durable-objects/platform/limits/)을 현재 계정 대시보드와 함께 확인한다. 결제를 즉석에서 활성화하지 말고 진행자에게 알려 로컬 진행 또는 검증된 대체 배포를 선택한다.

Context7 조회가 할당량 오류로 실패할 때는 `npx ctx7@latest login` 또는 `CONTEXT7_API_KEY` 설정으로 한도를 높인 뒤 공식 문서를 다시 조회한다. 비밀값은 명령 인자, 질문, 커밋에 포함하지 않는다.
