const express = require('express');
const stripe = require('stripe');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();

// Initialize Stripe with secret key
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(express.json({
    verify: (req, res, buf) => {
        if (req.originalUrl === '/webhook') {
            req.rawBody = buf;
        }
    }
}));
app.use(cors());

// Purchase token route
app.post('/purchase_token', async (req, res) => {
    try {
        const { userPrincipal, usdAmount } = req.body;

        if (!userPrincipal || !usdAmount) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Create a product
        const product = await stripeClient.products.create({
            name: 'token_buy',
            description: 'Purchase tokens with USD',
        });

        // Create a price for the product
        const price = await stripeClient.prices.create({
            product: product.id,
            unit_amount: usdAmount * 100, // Convert to cents
            currency: 'usd',
        });

        // Create a payment link
        const paymentLink = await stripeClient.paymentLinks.create({
            line_items: [
                {
                    price: price.id,
                    quantity: 1,
                },
            ],
            metadata: {
                userPrincipal,
                amountInIcp: 5, // Fixed amount as specified
            },
        });

        res.json({ paymentUrl: paymentLink.url });
    } catch (error) {
        console.error('Error creating payment link:', error);
        res.status(500).json({ error: 'Failed to create payment link' });
    }
});

// Webhook route for handling successful payments
app.post('/webhook', async (req, res) => {
    console.log('Webhook received');
    const sig = req.headers['stripe-signature'];

    try {
        const event = stripeClient.webhooks.constructEvent(
            req.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        // Handle successful payment
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const metadata = session.metadata;
            console.log('Metadata:', metadata);

            // Here you can implement the logic to transfer tokens to the user
            console.log('Payment successful for user:', metadata.userPrincipal);
            console.log('Amount in ICP to transfer:', metadata.amountInIcp);

            // Add your token transfer logic here
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: 'Webhook signature verification failed' });
    }
});

// Start the server
const PORT = process.env.PORT || 3012;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
