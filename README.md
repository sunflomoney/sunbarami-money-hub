# 썬바라미 재테크 허브

재테크 핵심글, 출간 도서와 투자 계산기를 모은 정적 웹사이트입니다.

## GitHub Pages 배포

1. 저장소 루트에 `index.html`, `styles.css`, `app.js`, `finance.js`, `data.js`, `assets/`를 유지합니다.
2. Settings → Pages → Build and deployment에서 Source를 **Deploy from a branch**로 선택합니다.
3. Branch를 **main**, Folder를 **/(root)**로 지정하고 Save를 누릅니다.
4. 배포가 끝나면 Pages 설정의 Visit site로 접속합니다.

별도 설치나 빌드 과정은 필요하지 않습니다. `.nojekyll`은 정적 파일을 그대로 배포하도록 지정합니다.

## 파일 안내

- `index.html`: 화면 구성 및 도서 판매 링크
- `styles.css`: 반응형 디자인
- `data.js`: 블로그 핵심글 목록
- `finance.js`: 투자 계산
- `app.js`: 검색, 필터, 계산기 동작
- `assets/`: 캐릭터, 책 표지, 글꼴과 라이선스

## 공개 배포용 준비 사항

원본 비공개 Sites는 변경하지 않았습니다. 이 복사본은 검색 차단 메타 태그와 비공개 안내 문구를 정리했습니다.
적립식 투자 계산기에 대출 상환·조기상환 계산기와 주식 물타기·목표 평단 역산 계산기를 추가했습니다.
대출은 고정금리·월 단위 가정이며, 물타기는 동일 통화·거래비용 제외 기준입니다.
글꼴 라이선스와 책 표지 출처는 assets 폴더에 보존되어 있습니다.
