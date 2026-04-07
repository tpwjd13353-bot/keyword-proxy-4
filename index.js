const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

// 헬스체크
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "keyword-proxy" });
});

// 검색 결과에서 실제 업체명만 필터 (지역명/검색어 자체 제외)
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
      { headers: HEADERS, timeout: 10000 }
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
