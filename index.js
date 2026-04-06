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

    const names = [];
    const matches = r.data.matchAll(/"name":"([^"]+)"/g);
    for (const m of matches) {
      names.push(m[1].replace(/<[^>]+>/g, ""));
      if (names.length >= 5) break;
    }

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
