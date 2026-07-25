/**
 * Parse pagination query params (?page=1&limit=20) into Sequelize-friendly
 * limit/offset, clamped to safe bounds.
 */
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query?.page, 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(query?.limit, 10) || DEFAULT_LIMIT),
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Build the standard paginated response envelope.
 */
export function paginatedResponse(data, count, { page, limit }) {
  return {
    ok: true,
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 0,
    },
  };
}

export default parsePagination;
