import { sequelize } from '../config/database.js';
import { Bookmaker, initBookmaker } from './Bookmaker.js';
import { Sport, initSport } from './Sport.js';
import { Event, initEvent } from './Event.js';
import { Market, initMarket } from './Market.js';
import { Odd, initOdd } from './Odd.js';

initBookmaker(sequelize);
initSport(sequelize);
initEvent(sequelize);
initMarket(sequelize);
initOdd(sequelize);

Sport.hasMany(Event, { foreignKey: 'sportId' });
Event.belongsTo(Sport, { foreignKey: 'sportId' });
Event.hasMany(Market, { foreignKey: 'eventId' });
Market.belongsTo(Event, { foreignKey: 'eventId' });
Market.hasMany(Odd, { foreignKey: 'marketId' });
Odd.belongsTo(Market, { foreignKey: 'marketId' });
Bookmaker.hasMany(Odd, { foreignKey: 'bookmakerId' });
Odd.belongsTo(Bookmaker, { foreignKey: 'bookmakerId' });

export { sequelize, Bookmaker, Sport, Event, Market, Odd };
