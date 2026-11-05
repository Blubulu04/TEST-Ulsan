# 길에 새긴 울산

울산 시민이 도로명 속 인물과 사건을 읽고, 선택한 도로의 역사에 대해 Gemini에 질문할 수 있는 대학 과제용 웹사이트입니다.

## 먼저 화면 보기

압축을 푼 뒤 이 폴더에서 실행합니다.

```sh
python -m http.server 8000 --bind 127.0.0.1 --directory docs
```

브라우저에서 [http://localhost:8000](http://localhost:8000)을 엽니다. 기본 설정에서는 개략 지도, 마커, 해설, 출처를 볼 수 있습니다. HTML 파일을 더블클릭하면 브라우저가 모듈을 차단할 수 있습니다.

## GitHub Pages 및 Gemini 배포

1. GitHub 저장소를 만들고 이 폴더의 파일을 올립니다. 저장소 루트에 `docs/`와 `worker/`가 있어야 합니다. **Settings → Pages → Build and deployment → Deploy from a branch**에서 `main`과 `/docs`를 선택합니다. 사이트 주소는 일반적으로 `https://사용자명.github.io/저장소명/`입니다.
2. [카카오 디벨로퍼스](https://developers.kakao.com/)에서 앱을 만들고 카카오맵 API를 활성화합니다. JavaScript 키에 `https://사용자명.github.io`를 등록합니다. 로컬 확인에도 쓰려면 `http://localhost:8000`도 등록합니다. `docs/config.js`의 `kakaoKey`에 **JavaScript 키**를 넣습니다.
3. [Google AI Studio](https://aistudio.google.com/apikey)에서 Gemini API 키를 발급합니다. `worker/wrangler.toml`의 `ALLOWED_ORIGINS`에 `https://사용자명.github.io`를 넣습니다. 로컬을 함께 허용하려면 `http://localhost:8000,https://사용자명.github.io`처럼 쉼표로 구분합니다. 이 값에는 저장소 경로나 끝 슬래시를 붙이지 않습니다. 기본 모델을 사용할 수 없는 계정이라면 `GEMINI_MODEL`을 계정에서 지원하는 GenerateContent 모델 ID로 수정합니다.
4. Node.js와 Cloudflare 계정이 있는 PC에서 아래 명령을 실행합니다. 마지막 명령의 프롬프트에 Gemini 키를 입력합니다.

```sh
cd worker
npx wrangler@4 login
npx wrangler@4 deploy
npx wrangler@4 secret put GEMINI_API_KEY
```

5. Worker 주소(예: `https://ulsan-history-ai.<이름>.workers.dev`)를 `docs/config.js`의 `apiBase`에 입력합니다. `/ask`는 코드가 추가합니다. 변경한 파일을 GitHub에 반영합니다.
6. 배포 주소에서 마커 네 개와 설명이 열리는지 확인합니다. 예시 질문을 누르고 **질문하기**를 누르면 아래에 답변이 표시됩니다. Cloudflare Worker는 허용 출처와 IP별 호출 빈도를 검사합니다. 공개 페이지의 질문 기능은 누구나 이용할 수 있으므로 Gemini 프로젝트의 할당량과 사용량을 확인하세요. 질문 텍스트는 답변 생성을 위해 Gemini에 전송됩니다.

Gemini 키는 Cloudflare Secret에만 입력합니다. 카카오 JavaScript 키는 도메인을 제한한 뒤 프런트엔드에 넣습니다.

## 도로 표시와 자료

- 지도에는 이예로, 아산로, 박상진로, 외솔큰길을 표시합니다. 요청의 ‘외솔길’은 울산시 기록에 나온 ‘외솔큰길’로 표기했습니다.
- 박상진로와 생가 주소인 박상진길은 별개입니다. 외솔기념관 주소는 병영12길입니다.
- 도로선과 마커는 설명용 개략 위치입니다. 경로 안내용 정밀 선형이 필요하면 `docs/roads.mjs`의 `path`를 검증된 WGS84 도로 중심선으로 교체하세요. 좌표 순서는 `[위도, 경도]`입니다.
- 인물과 사건의 근거는 각 도로의 **참고 자료**에 표시됩니다. Gemini는 선택한 도로의 자료를 바탕으로 답하도록 구성했습니다.

[카카오 지도 Web API](https://apis.map.kakao.com/web/) · [Gemini GenerateContent](https://ai.google.dev/api/generate-content) · [GitHub Pages](https://docs.github.com/en/pages/quickstart) · [Cloudflare Workers Secret](https://developers.cloudflare.com/workers/configuration/secrets/)
