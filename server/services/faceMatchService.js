/**
 * Face Match Service
 * Euclidean distance algorithm to match face descriptors
 * Uses same logic as face-api.js for consistency
 */

const MATCH_THRESHOLD = 0.5; // Lower = stricter match (0.4-0.6 recommended)

const FaceMatchService = {

  /**
   * Calculate Euclidean distance between two face descriptors
   * @param {number[]} desc1 - First face descriptor (128 floats)
   * @param {number[]} desc2 - Second face descriptor (128 floats)
   * @returns {number} Distance (0 = identical, >1 = very different)
   */
  euclideanDistance(desc1, desc2) {
    if (!desc1 || !desc2 || desc1.length !== desc2.length) {
      return Infinity;
    }
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
      const diff = desc1[i] - desc2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  },

  /**
   * Find the best matching user from DB
   * @param {number[]} faceDescriptor - Incoming face descriptor
   * @param {Array} users - Array of users with face_descriptor field
   * @returns {{ found: boolean, user: object|null, confidence: number }}
   */
  findBestMatch(faceDescriptor, users) {
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const user of users) {
      try {
        const storedDescriptor = typeof user.face_descriptor === 'string'
          ? JSON.parse(user.face_descriptor)
          : user.face_descriptor;

        const distance = this.euclideanDistance(faceDescriptor, storedDescriptor);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = user;
        }
      } catch (err) {
        console.warn(`⚠️ Could not parse face descriptor for user ${user.id}`);
      }
    }

    // Convert distance to confidence percentage (0-100%)
    const confidence = bestDistance === Infinity
      ? 0
      : Math.max(0, Math.round((1 - bestDistance) * 100));

    if (bestMatch && bestDistance <= MATCH_THRESHOLD) {
      return {
        found: true,
        user: bestMatch,
        confidence,
        distance: bestDistance
      };
    }

    return {
      found: false,
      user: null,
      confidence,
      distance: bestDistance
    };
  }
};

module.exports = FaceMatchService;
