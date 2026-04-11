const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Get products from Stripe
app.get("/products", async (req, res) => {
  try {
    const prices = await stripe.prices.list({
      expand: ["data.product"],
      active: true
    });

    const products = prices.data.map(p => ({
      priceId: p.id,
      name: p.product?.name || "Unnamed Product",
      price: p.unit_amount
    }));

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// Create Stripe Checkout session
app.post("/create-checkout-session", async (req, res) => {
  try {
    const items = req.body.items;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid cart items" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items.map(item => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name
          },
          unit_amount: item.price
        },
        quantity: item.qty
      })),
      success_url: "https://stripe-backend-1-c5ry.onrender.com",
      cancel_url: "https://stripe-backend-1-c5ry.onrender.com"
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
