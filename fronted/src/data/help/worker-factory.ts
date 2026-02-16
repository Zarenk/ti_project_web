/**
 * WORKER FACTORY
 *
 * Creates a Web Worker from inline code to avoid module resolution issues.
 * This approach works reliably across different bundlers and environments.
 */

import type { LearningSession } from './adaptive-learning'

/**
 * Creates a help analysis worker from inline code
 */
export function createHelpAnalysisWorker(): Worker | null {
  if (typeof window === 'undefined') return null

  try {
    // Inline worker code as a string
    const workerCode = `
      // ==================== TYPES ====================

      const MIN_FREQUENCY = 3;
      const threshold = 0.65;

      // ==================== LEVENSHTEIN DISTANCE ====================

      function levenshteinDistance(a, b) {
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
          matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
          matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
            }
          }
        }

        return matrix[b.length][a.length];
      }

      // ==================== CLUSTERING ====================

      function clusterSimilarQueries(queries) {
        const clusters = [];
        const processed = new Set();

        queries.forEach(query => {
          if (processed.has(query)) return;

          const cluster = [query];
          processed.add(query);

          queries.forEach(otherQuery => {
            if (processed.has(otherQuery)) return;

            const longer = query.length > otherQuery.length ? query : otherQuery;
            const shorter = query.length > otherQuery.length ? otherQuery : query;

            if (longer.length === 0) return;

            const distance = levenshteinDistance(longer, shorter);
            const similarity = (longer.length - distance) / longer.length;

            if (similarity > threshold) {
              cluster.push(otherQuery);
              processed.add(otherQuery);
            }
          });

          if (cluster.length > 0) {
            const representative = cluster.reduce((a, b) =>
              a.length > b.length ? a : b
            );
            clusters.push({ queries: cluster, representative });
          }
        });

        return clusters;
      }

      // ==================== PATTERN ANALYSIS ====================

      function analyzePatterns(sessions) {
        const startTime = performance.now();

        const sessionsBySection = new Map();

        sessions.forEach(session => {
          const section = session.section || 'general';
          if (!sessionsBySection.has(section)) {
            sessionsBySection.set(section, []);
          }
          sessionsBySection.get(section).push(session);
        });

        let suggestedAliases = 0;
        let suggestedEntries = 0;

        sessionsBySection.forEach((sectionSessions) => {
          const failedQueries = sectionSessions.filter(
            s => !s.matchFound || (s.matchScore && s.matchScore < 0.6)
          );

          if (failedQueries.length === 0) return;

          const clusters = clusterSimilarQueries(
            failedQueries.map(s => s.normalizedQuery)
          );

          clusters.forEach(cluster => {
            if (cluster.queries.length >= MIN_FREQUENCY) {
              if (cluster.queries.length >= 5) {
                suggestedAliases++;
              } else {
                suggestedEntries++;
              }
            }
          });
        });

        const processingTimeMs = performance.now() - startTime;

        return {
          suggestedAliases,
          suggestedEntries,
          processingTimeMs,
        };
      }

      // ==================== MESSAGE HANDLER ====================

      self.onmessage = (e) => {
        const { type, data } = e.data;

        try {
          switch (type) {
            case 'ANALYZE_PATTERNS': {
              const result = analyzePatterns(data.sessions);
              self.postMessage({
                type: 'PATTERNS_RESULT',
                data: result,
              });
              break;
            }

            default:
              throw new Error(\`Unknown message type: \${type}\`);
          }
        } catch (error) {
          self.postMessage({
            type: 'ERROR',
            data: {
              message: error instanceof Error ? error.message : 'Unknown error',
              originalType: type,
            },
          });
        }
      };
    `

    // Create blob from worker code
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)

    // Create worker from blob URL
    const worker = new Worker(workerUrl)

    // Clean up blob URL after worker is created
    URL.revokeObjectURL(workerUrl)

    return worker
  } catch (error) {
    console.warn('[Worker Factory] Failed to create worker:', error)
    return null
  }
}
