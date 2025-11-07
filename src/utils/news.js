// news.js — versi bypass Cloudflare menggunakan cloudscraper
// ---------------------------------------------
// Install dulu:
//   npm install cloudscraper cheerio
// ---------------------------------------------

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

// Konfigurasi header umum
const defaultHeaders = {
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://google.com/",
};

// Fungsi fetch dengan cloudscraper (bisa retry otomatis)
const fetchWithCloudscraper = async (url, retries = 3) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const html = await cloudscraper.get({
        uri: url,
        headers: {
          ...defaultHeaders,
          "User-Agent": randomUserAgent(),
        },
        gzip: true,
      });
      return html;
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Gagal ambil data (${i + 1}/${retries}): ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1))); // backoff delay
    }
  }
  throw new Error(`Gagal fetch dari ${url}: ${lastError.message}`);
};

// =================== BAGIAN UTAMA ===================

const fetchNewsData = async () => {
  const url = "https://jkt48.com/news/list?lang=id";
  try {
    const html = await fetchWithCloudscraper(url);
    return html;
  } catch (error) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};

const parseNewsData = (html) => {
  if (!html || html.length < 500) {
    console.error("❌ HTML terlalu pendek, kemungkinan kena Cloudflare.");
    throw new Error("HTML invalid.");
  }

  const $ = cheerio.load(html);
  const data_list_berita = [];

  console.log("✅ Mulai parsing...");

  $(".entry-news__list").each((index, container) => {
    const berita = $(container);

    const badge_img =
      berita.find(".entry-news__list--label img").attr("src") || null;

    const item = berita.find(".entry-news__list--item");
    const judul = item.find("h3").text().trim();
    const waktu = item.find("time").text().trim();
    const url = item.find("h3 > a").attr("href");

    if (!url) {
      console.warn(`⚠️ [${index}] Tidak dapat mengambil URL, skip`);
      return;
    }

    const berita_id = url
      .replace("/news/detail/id/", "")
      .replace("?lang=id", "");

    const data = {
      index,
      judul,
      waktu,
      berita_id,
      badge_url: badge_img ? "https://jkt48.com" + badge_img : null,
      source_url: "https://jkt48.com" + url,
    };

    console.log(`📌 Parsed [${index}] →`, data);

    data_list_berita.push(data);
  });

  console.log(`🔍 Total berita berhasil diparse: ${data_list_berita.length}`);

  if (data_list_berita.length === 0) {
    console.error(
      "❌ Selector sudah benar, tetapi tidak ada berita yang ditemukan."
    );
    console.log("DEBUG HTML:", html.substring(0, 400));
    throw new Error("Tidak ada data berita.");
  }

  return { berita: data_list_berita };
};

const fetchNewsDetail = async (berita_id) => {
  const url = `https://jkt48.com/news/detail/id/${berita_id}?lang=id`;

  try {
    const html = await fetchWithCloudscraper(url);
    const $ = cheerio.load(html);

    console.log("[DEBUG] Fetch detail:", url);

    const detail = {};

    // ✅ Ambil container utama berdasarkan struktur baru
    const contentDiv = $(".entry-news__detail > div:nth-of-type(4)");

    if (contentDiv.length === 0) {
      console.error(
        "❌ Selector konten detail tidak ditemukan. Dumping HTML untuk debug:"
      );
      console.log(html.substring(0, 500)); // print sebagian HTML
      return null;
    }

    // ✅ Ambil teks & list
    let deskripsi = "";
    contentDiv.find("p, ul, ol, li").each((i, el) => {
      const tag = $(el).prop("tagName").toLowerCase();

      if (tag === "p") deskripsi += $(el).text().trim() + "\n";
      if (tag === "li") deskripsi += "- " + $(el).text().trim() + "\n";
    });

    detail["deskripsi"] = deskripsi.trim();

    // ✅ Ambil gambar dalam konten
    const gambarList = [];
    contentDiv.find("img").each((i, img) => {
      const src = $(img).attr("src");
      if (src) {
        gambarList.push(
          src.startsWith("http") ? src : `https://jkt48.com${src}` // fix relative path
        );
      }
    });

    detail["gambar"] = gambarList;

    console.log("[DEBUG] Detail berita parsed:", detail);

    return detail;
  } catch (error) {
    console.error("❌ Error fetch detail:", error.message);
    return null;
  }
};

const fetchAndParseNews = async () => {
  try {
    const html = await fetchNewsData();
    const parsedData = parseNewsData(html);
    return parsedData;
  } catch (error) {
    console.error(`Error parsing news: ${error.message}`);
  }
};

module.exports = {
  fetchNewsData,
  parseNewsData,
  fetchNewsDetail,
  fetchAndParseNews,
};
