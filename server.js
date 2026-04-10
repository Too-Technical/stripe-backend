const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors({
  origin: "*"
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.get('/products', async (req, res) => {
  try {
    const prices = await stripe.prices.list({
      expand: ['data.product'],
      active: true
    });

    const products = prices.data.map(p => ({
      priceId: p.id,
      name: p.product.name,
      price: p.unit_amount,
    }));

    res.json(products);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
