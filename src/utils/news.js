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
    console.error("DEBUG HTML SHORT:", html.substring(0, 300));
    throw new Error("HTML kosong / terlalu pendek (kemungkinan kena Cloudflare).");
  }

  const $ = cheerio.load(html);
  const data_list_berita = [];

  console.log("✅ Mulai parsing data berita...");

  $("ul.entry-news__list > li").each((index, element) => {
    const el = $(element);

    const waktu = el.find("time").text().trim();
    const judul = el.find("h3").text().trim();
    const url = el.find("h3 > a").attr("href");

    if (!url) {
      console.warn(`⚠️ [${index}] URL tidak ditemukan, skip`);
      return;
    }

    const berita_id = url
      .replace("?lang=id", "")
      .replace("/news/detail/id/", "");

    const item = {
      index,
      waktu,
      judul,
      berita_id,
      source_url: "https://jkt48.com" + url,
    };

    // ✅ DEBUG setiap data yang berhasil diambil
    console.log(`📌 Parsed berita [${index}] →`, item);

    data_list_berita.push(item);
  });

  console.log("🔍 Total berita yang berhasil di-parse:", data_list_berita.length);

  if (data_list_berita.length === 0) {
    console.error("❌ Tidak ada data berita. Selector mungkin berubah.");
    console.error("DEBUG HTML:", html.substring(0, 400)); // tampilkan sample HTML
    throw new Error("Data berita tidak ditemukan (cek selector).");
  }

  return { berita: data_list_berita };
};

const fetchNewsDetail = async (berita_id) => {
  const url = `https://jkt48.com/news/detail/id/${berita_id}?lang=id`;
  try {
    const html = await fetchWithCloudscraper(url);
    const $ = cheerio.load(html);
    const detail = {};

    const mainContentSelector =
      "body > div.container > div.row > div.col-lg-9.order-1.order-lg-2.entry-contents__main-area > div > div";
    const mainContent = $(mainContentSelector);

    if (mainContent.length === 0) {
      throw new Error("Konten utama tidak ditemukan.");
    }

    let deskripsi = "";
    mainContent.find("p.MsoNormal, ul, ol").each((index, element) => {
      const tagName = $(element).prop("tagName").toLowerCase();

      if (tagName === "p") {
        deskripsi += $(element).text().trim() + "\n";
      } else if (tagName === "ul" || tagName === "ol") {
        $(element)
          .children()
          .each((i, child) => {
            deskripsi += $(child).text().trim() + "\n";
          });
      }
    });

    detail["deskripsi"] = deskripsi.trim();

    const gambarList = [];
    mainContent
      .find('span[lang="EN-GB"], span[lang="EN"]')
      .each((index, element) => {
        const gambarElement = $(element).find("img");
        if (gambarElement.length === 0) {
          const nextImg = $(element).next("img");
          if (nextImg.length > 0) {
            gambarElement.push(nextImg[0]);
          }
        }

        gambarElement.each((i, img) => {
          const gambar = {
            title: $(img).attr("title"),
            src: $(img).attr("src"),
            width: $(img).attr("width"),
            height: $(img).attr("height"),
          };
          gambarList.push(gambar);
        });
      });

    detail["gambar"] = gambarList;
    return detail;
  } catch (error) {
    console.error(
      `Error fetching detail for berita_id ${berita_id}: ${error.message}`
    );
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
