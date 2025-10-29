const axios = require('axios');
const filterUtils = require('../utils/filter');

const SHOWROOM_API_URL = 'https://www.showroom-live.com/api/live/onlives';

async function getFilteredLive() {
  try {
    const response = await axios.get(SHOWROOM_API_URL);
    const onlivesData = response.data.onlives;

    // Filter based on genre_id and room_url_key
    const filteredLive = filterUtils.filterJKT48(onlivesData);
    return filteredLive;
  } catch (error) {
    throw new Error('Error fetching Showroom data');
  }
}

module.exports = {
  getFilteredLive
};
