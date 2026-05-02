const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// 🔴 Required for Stripe webhook
app.use("/webhook", express.raw({ type: "application/json" }));

app.use(cors({ origin: "*" }));
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Get products
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
    res.status(500).send(err.message);
  }
});

// Create checkout session (NO sheet saving here anymore)
app.post("/create-checkout-session", async (req, res) => {
  try {
    const items = req.body.items;

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
      success_url: "https://stripe-backend-1-c5ry.onrender.com/success.html",
      cancel_url: "https://stripe-backend-1-c5ry.onrender.com/cancel.html"
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🔥 WEBHOOK — saves order AFTER payment
app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log("Webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const email = session.customer_details?.email || "no email";
    const total = session.amount_total || 0;

    await fetch("https://script.google.com/macros/s/AKfycbzvfFKAFckgyZ_D7QEN10aiqjwqT2HmhCmBpqoYIc8bFz6Kc_2HDcGRkEtdCOWp5fMrFg/exec", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [{ name: "Stripe Order", qty: 1 }],
        total,
        email
      })
    });
  }

  res.json({ received: true });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
