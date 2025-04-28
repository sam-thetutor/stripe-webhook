const express = require("express");
const stripe = require("stripe");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const { createActor } = require("./createActor");
const { idlFactory } = require("./storage.did.js");
const { idlFactory: icrc1Factory } = require("./canisters/icrc/index.did.js");
const {
  idlFactory: kongswapIdlFactory,
} = require("./canisters/kongswap/index.did.js");
const { Principal } = require("@dfinity/principal");

// Load environment variables
dotenv.config();

const app = express();

const storageCanister = "vv4p7-5yaaa-aaaal-asc7a-cai";
const ckUSDTCanisterId = "cngnf-vqaaa-aaaar-qag4q-cai";

let storageActor = createActor(storageCanister, idlFactory);

// Initialize Stripe with secret key
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());

// Special handling for webhook route
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    console.log("Webhook received", sig);
    try {
      const event = stripeClient.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      // Handle successful payment
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const metadata = session.metadata;
        console.log("Metadata:", metadata);

        // Store transaction in a canister
        try {
          let transaction = {
            destinationAddress: metadata.destinationAddress,
            paymentLinkId: metadata.paymentLinkId,
            usdAmount: metadata.usdAmount,
            tokenSymbol: metadata.tokenSymbol,
            destinationCanisterId: metadata.destinationCanisterId,
            tokenAmount: metadata.tokenAmount,
            isPaid: false,
            swapTxId: [],
            fromAmount: [],
            toAmount: [],
            price: [],
            slippage: [],
            error: [],
          };
          //save the transaction if it lands for the first time
          let results = await storageActor.storeTransaction(transaction);
          if (results) {
            console.log("Transaction stored:", results);

            //perform the token swap
            await performTokenSwap(transaction);
          }
        } catch (dbError) {
          console.error("Error saving transaction:", dbError);
          // Still send success to Stripe but log the error
          // You might want to implement retry logic or alert administrators
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: "Webhook signature verification failed" });
    }
  }
);

//perform the token swap
//always swap from ckusdt to the destination token
async function performTokenSwap(transaction) {
  try {
    //approve the kongswap to spend the corresponding amount of ckusdt

    let ckUSDTCanister = createActor(ckUSDTCanisterId, icrc1Factory);

    //get the token decimals and fee
    const tokenDecimals = await ckUSDTCanister.icrc1_decimals();
    const tokenFee = await ckUSDTCanister.icrc1_fee();

    console.log("Token decimals:", tokenDecimals);
    console.log("Token fee:", tokenFee);
    let cc =
      BigInt(
        Math.floor(parseFloat(transaction.usdAmount) * 10 ** tokenDecimals)
      ) + BigInt(tokenFee);
    console.log("cc:", cc);
    // Approve KongSwap to spend tokens
    const approveArgs = {
      spender: {
        owner: Principal.fromText("2ipq2-uqaaa-aaaar-qailq-cai"), // KongSwap canister ID
        subaccount: [], // No subaccount
      },
      amount: cc,
      expires_at: [], // No expiration
      memo: [], // No memo
      fee: [], // Default fee
      created_at_time: [], // Current time
      expected_allowance: [], // No expected allowance
      from_subaccount: [], // No subaccount
    };

    console.log("Approving KongSwap to spend tokens...", approveArgs);
    const approveResult = await ckUSDTCanister.icrc2_approve(approveArgs);
    console.log("Approve result:", approveResult);

    if ("Err" in approveResult) {
      throw new Error(`Approval failed: ${JSON.stringify(approveResult.Err)}`);
    }

    const kongswapActor = await createActor(
      "2ipq2-uqaaa-aaaar-qailq-cai",
      kongswapIdlFactory
    );

    // Prepare swap arguments
    const swapArgs = {
      pay_token: "IC." + ckUSDTCanisterId,
      receive_token: "IC." + transaction.destinationCanisterId,
      pay_amount: BigInt(
        Math.floor(parseFloat(transaction.usdAmount) * 10 ** tokenDecimals)
      ),
      receive_amount: [], // Let KongSwap calculate optimal amount
      max_slippage: [], // 0.5% slippage tolerance
      receive_address: [
        transaction.destinationAddress,
      ], // Empty means send to caller's address
      referred_by: [], // No referral
      pay_tx_id: [], // Let KongSwap generate tx id
    };

    console.log("Executing swap...");
    const result = await kongswapActor.swap(swapArgs);
    console.log("Swap result:", result);

    if ("Ok" in result) {
      //update the transaction stored inside the canister
      let updatedTransaction = {
        ...transaction,
        isPaid: true,
        swapTxId: result.Ok?.tx_id ? [result.Ok.tx_id.toString()] : [],
        fromAmount: result.Ok?.pay_amount
          ? [result.Ok.pay_amount.toString()]
          : [],
        toAmount: result.Ok?.receive_amount
          ? [result.Ok.receive_amount.toString()]
          : [],
        price: result.Ok?.price ? [result.Ok.price.toString()] : [],
        slippage: result.Ok?.slippage ? [result.Ok.slippage.toString()] : [],
        error: "Err" in result ? [result.Err] : [],
      };
      let updateResult = await storageActor.updateTransaction(
        transaction.paymentLinkId,
        updatedTransaction
      );
      if (updateResult) {
        console.log("success Transaction updated:", updateResult);
      } else {
        console.log("success Transaction update failed:", updateResult);
      }
    } else {
      //still save the data but log the error
      let updatedTransaction = {
        ...transaction,
        swapTxId: [],
        fromAmount: [],
        toAmount: [],
        price: [],
        slippage: [],
        error: [result.Err],
      };
      let updateResult = await storageActor.updateTransaction(
        transaction.paymentLinkId,
        updatedTransaction
      );
      if (updateResult) {
        console.log("failed Transaction updated:", updateResult);
      } else {
        console.log("failed Transaction update failed:", updateResult);
      }
    }
  } catch (error) {
    console.error("Error updating transaction:", error);
    // Add retry logic or error notification here
  }
}

// Regular JSON parsing middleware for other routes
app.use(express.json());

// Purchase token route
app.post("/purchase_token", async (req, res) => {
  try {
    const { userPrincipal, usdAmount } = req.body;

    if (!userPrincipal || !usdAmount) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Create a product
    const product = await stripeClient.products.create({
      name: "token_buy",
      description: "Purchase tokens with USD",
    });

    // Create a price for the product
    const price = await stripeClient.prices.create({
      product: product.id,
      unit_amount: usdAmount * 100, // Convert to cents
      currency: "usd",
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
    console.error("Error creating payment link:", error);
    res.status(500).json({ error: "Failed to create payment link" });
  }
});

// Start the server
const PORT = process.env.PORT || 3012;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
