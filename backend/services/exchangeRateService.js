import models from '../models/index.js';
import axios from 'axios';
import config from '../config/config.js';

export class ExchangeRateService {
  // Fetch exchange rates from external API
  static async fetchLatestRates() {
    try {
      const currencies = await models.Currency.findAll({ where: { isActive: true } });
      const today = new Date().toISOString().split('T')[0];
      
      const rates = [];

      for (const currency of currencies) {
        if (currency.code === 'USD') {
          // Base currency - set fixed rates or fetch from different source
          rates.push({
            currency_id: currency.id,
            rateDate: today,
            buyingRate: 1,
            sellingRate: 1,
            midRate: 1,
            isActive: true
          });
        } else {
          // Fetch from API (example using exchangerate-api.com)
          try {
            const response = await axios.get(
              `${config.exchangeRateApi.baseUrl}/USD`
            );
            
            const rate = response.data.rates[currency.code];
            if (rate) {
              // Calculate buying/selling rates with spread
              const spread = 0.02; // 2% spread
              const buyingRate = rate * (1 - spread/2);
              const sellingRate = rate * (1 + spread/2);

              rates.push({
                currency_id: currency.id,
                rateDate: today,
                buyingRate: buyingRate,
                sellingRate: sellingRate,
                midRate: rate,
                isActive: true
              });
            }
          } catch (apiError) {
            console.error(`Failed to fetch rate for ${currency.code}:`, apiError);
            // Use yesterday's rate as fallback
            const yesterdayRate = await models.ExchangeRate.findOne({
              where: { currency_id: currency.id },
              order: [['rateDate', 'DESC']]
            });

            if (yesterdayRate) {
              rates.push({
                currency_id: currency.id,
                rateDate: today,
                buyingRate: yesterdayRate.buyingRate,
                sellingRate: yesterdayRate.sellingRate,
                midRate: yesterdayRate.midRate,
                isActive: true
              });
            }
          }
        }
      }

      // Save rates to database
      for (const rateData of rates) {
        await models.ExchangeRate.create(rateData);
      }

      return rates;
    } catch (error) {
      throw new Error(`Failed to fetch exchange rates: ${error.message}`);
    }
  }

  // Get rates for specific date
  static async getRatesForDate(date) {
    try {
      return await models.ExchangeRate.findAll({
        where: { rateDate: date, isActive: true },
        include: [models.Currency]
      });
    } catch (error) {
      throw new Error(`Failed to get exchange rates: ${error.message}`);
    }
  }
}