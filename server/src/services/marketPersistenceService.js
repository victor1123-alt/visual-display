import { env } from '../config/env.js';
import { sequelize, Bookmaker, Sport, Event, Market, Odd } from '../models/index.js';

function slugify(value, fallback = 'unknown') {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  return slug || fallback;
}

function validDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventStatus(event) {
  if (event.completed) return 'finished';
  return 'scheduled';
}

async function findOrCreateSport(event, transaction) {
  const name = event.sport_title || event.sport_key || 'Unknown sport';
  const slug = slugify(event.sport_key || name);
  const [sport] = await Sport.findOrCreate({
    where: { slug },
    defaults: { name, slug },
    transaction
  });
  return sport;
}

export async function persistOddsSnapshot(snapshot) {
  if (!env.dbEnabled) return { persisted: false, reason: 'database-disabled' };

  const transaction = await sequelize.transaction();
  let eventCount = 0;
  let marketCount = 0;
  let oddCount = 0;

  try {
    for (const rawEvent of snapshot.events || []) {
      const startsAt = validDate(rawEvent.commence_time);
      if (!rawEvent.id || !startsAt) continue;

      const sport = await findOrCreateSport(rawEvent, transaction);
      const [event] = await Event.findOrCreate({
        where: { sportId: sport.id, externalId: String(rawEvent.id) },
        defaults: {
          sportId: sport.id,
          externalId: String(rawEvent.id),
          homeTeam: rawEvent.home_team || 'Home team',
          awayTeam: rawEvent.away_team || 'Away team',
          startsAt,
          status: eventStatus(rawEvent)
        },
        transaction
      });
      await event.update({
        homeTeam: rawEvent.home_team || event.homeTeam,
        awayTeam: rawEvent.away_team || event.awayTeam,
        startsAt,
        status: eventStatus(rawEvent)
      }, { transaction });
      eventCount += 1;

      for (const rawBookmaker of rawEvent.bookmakers || []) {
        if (!rawBookmaker.title) continue;
        const bookmakerSlug = slugify(rawBookmaker.key || rawBookmaker.title, `bookmaker-${event.id}`);
        const [bookmaker] = await Bookmaker.findOrCreate({
          where: { slug: bookmakerSlug },
          defaults: { name: rawBookmaker.title, slug: bookmakerSlug, isActive: true },
          transaction
        });

        for (const rawMarket of rawBookmaker.markets || []) {
          const outcomes = (rawMarket.outcomes || [])
            .filter((outcome) => outcome.name && Number.isFinite(Number(outcome.price)) && Number(outcome.price) > 1)
            .map((outcome) => ({ name: outcome.name, price: Number(outcome.price) }));
          if (!rawMarket.key || outcomes.length === 0) continue;

          const [market] = await Market.findOrCreate({
            where: { eventId: event.id, marketKey: rawMarket.key },
            defaults: { eventId: event.id, marketKey: rawMarket.key, name: rawMarket.key, outcomes },
            transaction
          });
          await market.update({ outcomes }, { transaction });
          marketCount += 1;

          for (const outcome of outcomes) {
            await Odd.create({
              marketId: market.id,
              bookmakerId: bookmaker.id,
              outcome: outcome.name,
              value: outcome.price,
              capturedAt: validDate(snapshot.capturedAt) || new Date(),
              sourceUrl: 'https://the-odds-api.com/'
            }, { transaction });
            oddCount += 1;
          }
        }
      }
    }

    await transaction.commit();
    return { persisted: true, eventCount, marketCount, oddCount };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
