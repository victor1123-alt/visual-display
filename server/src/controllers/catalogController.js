import { env } from '../config/env.js';
import { Bookmaker, Event, Sport } from '../models/index.js';

function databaseUnavailable(response) {
  return response.json({ data: [], meta: { storage: 'in-memory', message: 'Enable DB_ENABLED to query the Sequelize catalog.' } });
}

export async function listSports(_request, response, next) {
  if (!env.dbEnabled) return databaseUnavailable(response);
  try {
    const sports = await Sport.findAll({ order: [['name', 'ASC']] });
    return response.json({ data: sports, meta: { storage: 'mysql' } });
  } catch (error) {
    return next(error);
  }
}

export async function listBookmakers(_request, response, next) {
  if (!env.dbEnabled) return databaseUnavailable(response);
  try {
    const bookmakers = await Bookmaker.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
    return response.json({ data: bookmakers, meta: { storage: 'mysql' } });
  } catch (error) {
    return next(error);
  }
}

export async function listEvents(request, response, next) {
  if (!env.dbEnabled) return databaseUnavailable(response);
  try {
    const requestedLimit = Number(request.query.limit);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 50;
    const events = await Event.findAll({
      include: [{ model: Sport, attributes: ['id', 'name', 'slug'] }],
      order: [['startsAt', 'ASC']],
      limit
    });
    return response.json({ data: events, meta: { storage: 'mysql', total: events.length } });
  } catch (error) {
    return next(error);
  }
}
