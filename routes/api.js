'use strict';

const fetch = require('node-fetch');
const Stock = require('../models/stock'); // Importa el modelo de base de datos para manejar acciones
const crypto = require('crypto'); // Para anonimizar IPs

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async function (req, res) {
      try {
        const { stock, like } = req.query;

        if (!stock) {
          return res.status(400).json({ error: 'Stock symbol is required' });
        }

        // Manejo de una o dos acciones
        const stocks = Array.isArray(stock) ? stock : [stock];

        const stockData = await Promise.all(stocks.map(async (symbol) => {
          const stockInfo = await getStockPrice(symbol);

          if (!stockInfo) {
            return { symbol, error: 'Invalid stock symbol' };
          }

          // Anonimizar IP y manejar likes
          let likes = 0;
          if (like === 'true') {
            const ipHash = anonymizeIP(req.ip);
            likes = await handleLike(symbol, ipHash);
          }

          return {
            stock: stockInfo.symbol,
            price: stockInfo.latestPrice,
            likes: likes || await getLikes(symbol),
          };
        }));

        if (stocks.length === 2) {
          // Comparar likes de dos acciones
          const [stock1, stock2] = stockData;
          return res.json({ stockData: [stock1, stock2] });
        }

        // Retornar información de una acción
        return res.json({ stockData: stockData[0] });

      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });
};

// Función para obtener el precio de una acción desde la API proxy
async function getStockPrice(symbol) {
  try {
    const response = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error('Error fetching stock price:', err);
    return null;
  }
}

// Anonimizar IP usando hashing
function anonymizeIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

// Manejar likes y evitar duplicados
async function handleLike(symbol, ipHash) {
  let stock = await Stock.findOne({ symbol });

  if (!stock) {
    stock = new Stock({ symbol, likes: 0, userIps: [] });
  }

  if (!stock.userIps.includes(ipHash)) {
    stock.likes += 1;
    stock.userIps.push(ipHash);
    await stock.save();
  }

  return stock.likes;
}

// Obtener número de likes para una acción
async function getLikes(symbol) {
  const stock = await Stock.findOne({ symbol });
  return stock ? stock.likes : 0;
}
