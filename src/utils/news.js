// news.js — versi bypass Cloudflare menggunakan cloudscraper
//-----------------------------------------------------------
const cloudscraper = require("cloudscraper");
const cheerio = require("cheerio");

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
];

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const defaultHeaders = {
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://google.com/"
};

const fetchWithCloudscraper = async (url, retries = 3) => {
  let error;
  for (let i = 0; i < retries; i++) {
    try {
      return await cloudscraper.get({
        uri: url,
        headers: { 
          ...defaultHeaders,
          "User-Agent": randomUserAgent()
        },
        gzip: true
      });
    } catch (err) {
      error = err;
      await new Promise(r => setTimeout(r, 700 * (i + 1)));
    }
  }
  throw new Error(error.message);
};

// ===================== PARSE LIST =====================

const fetchNewsData = async () => {
  return await fetchWithCloudscraper("https://jkt48.com/news/list?lang=id");
};

const parseNewsData = (html) => {
  const $ = cheerio.load(html);
  const list = [];

  $(".entry-news__list").each((i, el) => {
    const item = $(el);

    const badge = item.find(".entry-news__list--label img").attr("src");
    const title = item.find(".entry-news__list--item h3").text().trim();
    const waktu = item.find(".entry-news__list--item time").text().trim();
    const href = item.find(".entry-news__list--item h3 a").attr("href");

    if (!href) return;

    const berita_id = href.replace("/news/detail/id/", "").replace("?lang=id", "");

    list.push({
      index: i,
      judul: title,
      waktu,
      berita_id,
      badge_url: badge ? "https://jkt48.com" + badge : null,
      source_url: "https://jkt48.com" + href,
      detail: null, // akan diisi STRING, bukan object
      image: []     // akan diisi array gambar
    });
  });

  return list;
};

// ===================== PARSE DETAIL =====================

const fetchNewsDetail = async (berita_id) => {
  const url = `https://jkt48.com/news/detail/id/${berita_id}?lang=id`;

  try {
    const html = await fetchWithCloudscraper(url);
    const $ = cheerio.load(html);

    const root = $(".entry-news__detail");
    if (root.length === 0) return { detail: "", image: [] };

    // Ambil paragraf
    const paragraphs = [];
    root.find("p").each((i, el) => {
      const t = $(el).text().trim();
      if (t) paragraphs.push(t);
    });
    const detailText = paragraphs.join("\n\n");

    // Ambil gambar
    const images = [];
    root.find("img").each((i, img) => {
      let src = $(img).attr("src");
      if (!src) return;
      if (!src.startsWith("http")) src = "https://jkt48.com" + src;
      images.push(src);
    });

    return {
      detail: detailText, // STRING SAJA
      image: images
    };

  } catch (err) {
    return { detail: "", image: [] };
  }
};

// =================== LIST + DETAIL ===================

const attachDetailToList = async () => {
  const html = await fetchNewsData();
  const list = parseNewsData(html);

  for (let i = 0; i < list.length; i++) {
    const d = await fetchNewsDetail(list[i].berita_id);

    list[i].detail = d.detail; // STRING
    list[i].image = d.image;   // ARRAY
  }

  return list;
};

// =======================================================

module.exports = {
  fetchNewsData,
  parseNewsData,
  fetchNewsDetail,
  attachDetailToList
};
        
