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
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};

const parseNewsData = (html) => {
  const $ = cheerio.load(html);
  const data = {};
  const list_berita_mentah = $(".entry-news__list");
  const data_list_berita = [];
  const size_of_berita = list_berita_mentah.length;
  let position_berita = 0;

  while (position_berita < size_of_berita) {
    const model = {};
    const berita_mentah = list_berita_mentah.eq(position_berita);

    const badge_div = berita_mentah.find(".entry-news__list--label");
    const badge_img = badge_div.find("img");
    if (badge_img.attr("src")) {
      model["badge_url"] = badge_img.attr("src");
    }

    const title_div = berita_mentah.find(".entry-news__list--item");

    const waktu = title_div.find("time").text();
    model["waktu"] = waktu;

    const judul = title_div.find("h3").text();
    model["judul"] = judul;

    const url_berita_full = title_div.find("h3").find("a").attr("href");
    const url_berita_full_rplc = url_berita_full.replace("?lang=id", "");
    const url_berita_full_rplc_2 = url_berita_full_rplc.replace("/news/detail/id/", "");

    model["berita_id"] = url_berita_full_rplc_2;
    data_list_berita.push(model);
    position_berita += 1;
  }

  data["berita"] = data_list_berita;
  return data;
};

const fetchNewsDetail = async (berita_id) => {
  const url = `https://jkt48.com/news/detail/id/${berita_id}?lang=id`;

  try {
    const response = await axios.get(url, axiosConfig);

    // Log response data untuk debugging
    console.log(`Fetching detail for: ${url}`);
    console.log(response.data);

    const $ = cheerio.load(response.data);
    const detail = {};

    // Mengambil deskripsi dari semua elemen <p class="MsoNormal">
    let deskripsi = "";
    $('p.MsoNormal').each((index, element) => {
      deskripsi += $(element).text().trim() + "\n"; // Gabungkan teks dari setiap paragraf dengan newline
    });
    detail["deskripsi"] = deskripsi.trim(); // Trim deskripsi akhir untuk menghilangkan newline yang berlebihan

    // Mengambil semua gambar dalam <span lang="EN-GB">
    const gambarList = [];
    $('span[lang="EN-GB"] img').each((index, element) => {
      const gambar = {
        title: $(element).attr('title'),
        src: $(element).attr('src'),
        width: $(element).attr('width'),
        height: $(element).attr('height'),
      };
      gambarList.push(gambar);
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
    const newsData = parseNewsData(html);
    return newsData;
  } catch (error) {
    console.error(error.message);
  }
};

module.exports = {
  fetchNewsData,
  parseNewsData,
  fetchNewsDetail,
  fetchAndParseNews,
};
