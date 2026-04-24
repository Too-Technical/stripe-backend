app.post("/create-checkout-session", async (req, res) => {
  try {
    const items = req.body.items;

    // Validate cart
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Calculate total
    const total = items.reduce((sum, item) => {
      return sum + item.price * item.qty;
    }, 0);

    // Create Stripe session (collect email)
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

    // Send order to Google Sheets (with email if available)
    await fetch(
      "https://script.google.com/macros/s/AKfycbzvfFKAFckgyZ_D7QEN10aiqjwqT2HmhCmBpqoYIc8bFz6Kc_2HDcGRkEtdCOWp5fMrFg/exec",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items,
          total,
          email: session.customer_email || "no email"
        })
      }
    );

    res.json({ url: session.url });

  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: err.message });
  }
});
