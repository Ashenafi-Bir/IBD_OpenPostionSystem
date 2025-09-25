import models from '../models/index.js';

export const getCurrencies = async (req, res) => {
  try {
    const currencies = await models.Currency.findAll({
      where: { isActive: true },
      order: [['code', 'ASC']]
    });

    res.json(currencies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
};

export const getCurrencyById = async (req, res) => {
  try {
    const currency = await models.Currency.findByPk(req.params.id);
    
    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    res.json(currency);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch currency' });
  }
};

export const createCurrency = async (req, res) => {
  try {
    const { code, name, symbol } = req.body;

    // Check if currency code already exists
    const existingCurrency = await models.Currency.findOne({
      where: { code }
    });

    if (existingCurrency) {
      return res.status(400).json({ error: 'Currency code already exists' });
    }

    const currency = await models.Currency.create({
      code,
      name,
      symbol,
      isActive: true
    });

    res.status(201).json(currency);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create currency' });
  }
};

export const updateCurrency = async (req, res) => {
  try {
    const currency = await models.Currency.findByPk(req.params.id);
    
    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    await currency.update(req.body);
    res.json(currency);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update currency' });
  }
};

export const deleteCurrency = async (req, res) => {
  try {
    const currency = await models.Currency.findByPk(req.params.id);
    
    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    // Check if currency is used in other tables
    const usedInRates = await models.ExchangeRate.findOne({
      where: { currency_id: currency.id }
    });

    if (usedInRates) {
      return res.status(400).json({ error: 'Cannot delete currency that is used in exchange rates' });
    }

    await currency.update({ isActive: false });
    res.json({ message: 'Currency deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete currency' });
  }
};