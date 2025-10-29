function filterJKT48(onlivesData) {
  try {
    const OnlivesIdol = onlivesData.find(onlvs => onlvs.genre_id === 200);

    if (OnlivesIdol && OnlivesIdol.lives) {
      return OnlivesIdol.lives.filter(
        live =>
          live.room_url_key && // Ensure room_url_key exists
          live.room_url_key.includes('JKT48') &&
          live.premium_room_type !== 4 // Check premium room type
      );
    }

    // Return an empty array if no valid data is found
    return [];
  } catch (error) {
    // Log an error if something goes wrong
    console.error("Error filtering JKT48 data:", error);
    return [];
  }
}

module.exports = {
  filterJKT48
};
