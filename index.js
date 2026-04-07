const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// User-Agent 랜덤화
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPR/114.0.0.0",
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getHeaders() {
  return {
    "User-Agent": randomUA(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Cache-Control": "max-age=0",
  };
}

// 헬스체크
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "keyword-proxy" });
});

// 검색 결과에서 실제 업체명만 필터
function filterPlaceNames(names, keyword) {
  return names.filter((n) => {
    if (n.length <= 2) return false;
    if (n === keyword || n.replace(/\s/g, "") === keyword.replace(/\s/g, "")) return false;
    return true;
  });
}

// 키워드 순위 체크
app.post("/check", async (req, res) => {
  const { keyword, targetName } = req.body;

  if (!keyword || !targetName) {
    return res.status(400).json({ error: "keyword, targetName 필요" });
  }

  try {
    const r = await axios.get(
      `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(keyword)}`,
      { headers: getHeaders(), timeout: 10000 }
    );

    const rawNames = [];
    const matches = r.data.matchAll(/"name":"([^"]+)"/g);
    for (const m of matches) {
      rawNames.push(m[1].replace(/<[^>]+>/g, ""));
      if (rawNames.length >= 10) break;
    }
    const names = filterPlaceNames(rawNames, keyword).slice(0, 5);

    let rank = null;
    for (let i = 0; i < names.length; i++) {
      if (names[i].includes(targetName)) {
        rank = i + 1;
        break;
      }
    }

    res.json({ keyword, rank, top5: names });
  } catch (err) {
    res.json({ keyword, rank: null, top5: [], error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`keyword-proxy running on port ${PORT}`);
});
