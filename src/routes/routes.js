// routes.js
const express = require("express");
const router = express.Router();
const { fetchData, parseData } = require("../utils/theater");
const { fetchNewsData, parseNewsData, fetchNewsDetail } = require("../utils/news");
const { fetchSpecificData, parseSpecificData } = require("../utils/schedule");
const { fetchBirthdayData, parseBirthdayData } = require("../utils/birthday");
const { fetchMemberDataId, parseMemberDataId, fetchMemberSocialMediaId, parseMemberSocialMediaId } = require("../utils/memberid");
const { fetchNewsSearchData, parseNewsSearchData } = require("../utils/news-search");
const { fetchMemberData, parseMemberData } = require("../utils/member");
const { fetchBannerData, parseBannerData } = require("../utils/banner");
const { fetchScheduleSectionData, parseScheduleSectionData } = require("../utils/schedule-section");
const { fetchHtmlFromJKT48, parseVideoData } = require("../utils/video");
const { filterIDNLivesByUsernames } = require("../utils/idnlivesUtils");
const showroomService = require('../services/showroomService');
const { sendLogToDiscord } = require("../other/discordLogger");

const scrapeData = () => {
  // Simulating a scraping failure
  throw new Error("Scraping failed!");
};

const jkt48Usernames = [
  "jkt48_freya",
  "jkt48_ashel",
  "jkt48_amanda",
  "jkt48_gita",
  "jkt48_lulu",
  "jkt48_jessi",
  "jkt48_shani",
  "jkt48_raisha",
  "jkt48_muthe",
  "jkt48_chika",
  "jkt48_christy",
  "jkt48_lia",
  "jkt48_cathy",
  "jkt48_cynthia",
  "jkt48_daisy",
  "jkt48_indira",
  "jkt48_eli",
  "jkt48_michie",
  "jkt48_gracia",
  "jkt48_ella",
  "jkt48_adel",
  "jkt48_feni",
  "jkt48_marsha",
  "jkt48_zee",
  "jkt48_lyn",
  "jkt48_indah",
  "jkt48_elin",
  "jkt48_chelsea",
  "jkt48_danella",
  "jkt48_gendis",
  "jkt48_gracie",
  "jkt48_greesel",
  "jkt48_flora",
  "jkt48_olla",
  "jkt48_kathrina",
  "jkt48_oniel",
  "jkt48_fiony",
  "jkt48_callie",
  "jkt48_alya",
  "jkt48_anindya",
  "jkt48_jeane",
  "jkt48-official",
  "jkt48_nala",
  "jkt48_aralie",
  "jkt48_delynn",
  "jkt48_lana",
  "jkt48_erine",
  "jkt48_fritzy",
  "jkt48_lily",
  "jkt48_trisha",
  "jkt48_moreen",
  "jkt48_levi",
  "jkt48_nayla",
  "jkt48_nachia",
  "jkt48_oline",
  "jkt48_regie",
  "jkt48_ribka",
  "jkt48_kimmy",
  "jkt48_intan",
  "jkt48_maira",
  "jkt48_virgi",
  "jkt48_auwia",
  "jkt48_rilly",
  "jkt48_giaa",
  "jkt48_ekin",
  "jkt48_jemima",
  "jkt48_mikaela",
];

router.get('/showroom', async (req, res) => {
  try {
    const filteredLive = await showroomService.getFilteredLive();
    res.json(filteredLive);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

router.get("/idn", async (req, res) => {
  try {
    const filteredData = await filterIDNLivesByUsernames(jkt48Usernames);

    if (filteredData.length === 0) {
      res.json([]);
    } else {
      res.json(filteredData);
    }
  } catch (error) {
    console.error("Error fetching IDN lives:", error);
    const errorMessage = `Scraping schedule failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");
    res.status(500).json({ error: "Failed to fetch IDN lives" });
  }
});

router.get("/schedule", async (req, res) => {
  try {
    const htmlData = await fetchData();
    const scheduleData = parseData(htmlData);
    res.json(scheduleData);
  } catch (error) {
    console.error("Error fetching or parsing schedule data:", error);
    const errorMessage = `Scraping schedule failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/news", async (req, res) => {
  try {
    // Step 1: Fetch the news data
    const htmlData = await fetchNewsData();
    const newsData = parseNewsData(htmlData);

    if (!newsData || !newsData.berita || newsData.berita.length === 0) {
      throw new Error("No news data available for processing.");
    }

    // Step 2: Fetch details for each news item
    const newsDetailsPromises = newsData.berita.map(async (item) => {
      const detail = await fetchNewsDetail(item.berita_id);
      return { ...item, detail }; // Combine news item with its detail
    });

    // Step 3: Wait for all detail fetches to complete
    const newsDetails = await Promise.all(newsDetailsPromises);

    // Send the combined data
    res.json(newsDetails);
  } catch (error) {
    console.error("Error fetching or parsing news data:", error);
    const errorMessage = `Scraping news failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/events", async (req, res) => {
  try {
    const htmlData = await fetchSpecificData();
    const specificData = parseSpecificData(htmlData);
    res.status(200).json({ success: true, data: specificData });
  } catch (error) {
    console.error("Error fetching or parsing specific data:", error);
    const errorMessage = `Scraping events failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

router.get("/birthdays", async (req, res) => {
  try {
    const htmlData = await fetchBirthdayData();
    const birthdayData = parseBirthdayData(htmlData);
    res.json(birthdayData);
  } catch (error) {
    console.error("Error fetching or parsing birthday data:", error);
    const errorMessage = `Scraping birthdays failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/schedule/section", async (req, res) => {
  try {
    const htmlData = await fetchScheduleSectionData();
    const teaterData = parseScheduleSectionData(htmlData);
    res.json(teaterData);
  } catch (error) {
    console.error("Error fetching or parsing schedule section data:", error);
    const errorMessage = `Scraping schedule section failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/video", async (req, res) => {
  try {
    const htmlData = await fetchHtmlFromJKT48();
    const videoData = parseVideoData(htmlData);
    res.json(videoData);
  } catch (error) {
    console.error("Error fetching or parsing video data:", error);
    const errorMessage = `Scraping video data failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/member/:id", async (req, res) => {
  const memberId = req.params.id;
  try {
    const memberHtmlData = await fetchMemberDataId(memberId);
    const memberData = parseMemberDataId(memberHtmlData);

    const socialMediaHtmlData = await fetchMemberSocialMediaId(memberId);
    const socialMediaData = parseMemberSocialMediaId(socialMediaHtmlData);

    const combinedData = { ...memberData, socialMedia: socialMediaData };

    res.json(combinedData);
  } catch (error) {
    console.error("Error fetching or parsing member data:", error);
    const errorMessage = `Scraping member data failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/news/:page", async (req, res) => {
  const page = req.params.page || 1;

  try {
    const html = await fetchNewsSearchData(page);
    const newsData = parseNewsSearchData(html);
    res.status(200).json({ success: true, data: newsData });
  } catch (error) {
    console.error("Error fetching or parsing news data:", error);
    const errorMessage = `Scraping news data failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

router.get("/member", async (req, res) => {
  try {
    const html = await fetchMemberData();
    const members = parseMemberData(html);
    res.json({ members });
  } catch (error) {
    console.error("Error fetching or parsing member data:", error);
    const errorMessage = `Scraping member data failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/banners", async (req, res) => {
  try {
    const html = await fetchBannerData("https://jkt48.com");
    const banners = parseBannerData(html);
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error("Error fetching or parsing banner data:", error);
    const errorMessage = `Scraping banners data failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

module.exports = router;
