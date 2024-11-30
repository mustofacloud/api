const axios = require("axios");
const cheerio = require("cheerio");

const axiosConfig = {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36",
  },
};

const fetchNewsData = async () => {
  const url = "https://jkt48.com/news/list?lang=id";

  try {
    const response = await axios.get(url, axiosConfig);
    return response.data;
  } catch (error) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};

const parseNewsData = (html) => {
  const $ = cheerio.load(html);
  const list_berita_mentah = $(".entry-news__list");
  
  if (!list_berita_mentah || list_berita_mentah.length === 0) {
    throw new Error("No news data found on the page.");
  }

  const data_list_berita = [];
  list_berita_mentah.each((index, element) => {
    const model = {};
    const berita_mentah = $(element);

    const badge_div = berita_mentah.find(".entry-news__list--label");
    const badge_img = badge_div.find("img");
    if (badge_img.attr("src")) {
      model["badge_url"] = badge_img.attr("src");
    }

    const title_div = berita_mentah.find(".entry-news__list--item");

    const waktu = title_div.find("time").text().trim();
    model["waktu"] = waktu;

    const judul = title_div.find("h3").text().trim();
    model["judul"] = judul;

    const url_berita_full = title_div.find("h3").find("a").attr("href");
    if (!url_berita_full) {
      console.warn("Missing URL for a news item. Skipping.");
      return; // Skip this news item
    }

    const url_berita_full_rplc = url_berita_full.replace("?lang=id", "").replace("/news/detail/id/", "");
    model["berita_id"] = url_berita_full_rplc;

    data_list_berita.push(model);
  });

  return { berita: data_list_berita };
};

const fetchNewsDetail = async (berita_id) => {
  const url = `https://jkt48.com/news/detail/id/${berita_id}?lang=id`;

  try {
    const response = await axios.get(url, axiosConfig);

    const $ = cheerio.load(response.data);
    const detail = {};

    // Menggabungkan deskripsi dari elemen <p>, <ul>, dan <ol>
    let deskripsi = "";
    const paragraphSelector = "p.MsoNormal, ul, ol";

    $(paragraphSelector).each((index, element) => {
      const tagName = $(element).prop("tagName").toLowerCase();

      if (tagName === "p") {
        // Tambahkan teks dari <p>
        deskripsi += $(element).text().trim() + "\n";
      } else if (tagName === "ul") {
        // Tambahkan daftar dari <ul>
        $(element)
          .find("li")
          .each((i, li) => {
            deskripsi += `- ${$(li).text().trim()}\n`;
          });
      } else if (tagName === "ol") {
        // Tambahkan daftar bernomor dari <ol>
        $(element)
          .find("li")
          .each((i, li) => {
            deskripsi += `${i + 1}. ${$(li).text().trim()}\n`;
          });
      }
    });

    detail["deskripsi"] = deskripsi.trim();

    // Mengambil gambar
    const gambarList = [];
    $("span[lang='EN-GB'], span[lang='EN']").each((index, element) => {
      let gambarElement = $(element).find("img");

      // Jika tidak ada gambar di dalam <span>, cari gambar di elemen berikutnya
      if (gambarElement.length === 0) {
        gambarElement = $(element).next("img");
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
    console.error(`Error fetching detail for berita_id ${berita_id}: ${error.message}`);
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
