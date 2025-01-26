require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { default: mongoose } = require("mongoose");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  // verify the token

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.crj7d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    // Database and collections
    const ApartmentCollections = client
      .db("building_management")
      .collection("apartments");

    const UserCollections = client
      .db("building_management")
      .collection("users");

    const HistoryCollections = client
      .db("building_management")
      .collection("histories");

    app.get("/apartments", async (req, res) => {
      const result = await ApartmentCollections.find().toArray();
      res.status(200).json({
        success: true,
        data: result,
      });
    });

    app.get("/apartments/:id", async (req, res) => {
      const { id } = req.params; // Destructure `id` from req.params
      const result = await ApartmentCollections.findOne({
        _id: new mongoose.Types.ObjectId(id),
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    });

    app.post("/create-user", async (req, res) => {
      const data = req.body;
      const result = await UserCollections.insertOne(data, { new: true });
      res.status(200).json({
        success: true,
        data: result,
      });
    });

    app.get("/users", verifyToken, async (req, res) => {
      const result = await UserCollections.find({
        role: { $ne: "admin" },
      }).toArray();
      res.status(200).json({
        success: true,
        data: result,
      });
    });

    app.post("/login", async (req, res) => {
      const uid = req.body?.uid;

      const user = await UserCollections.findOne({ uid });

      if (!user?._id) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const token = jwt.sign(
        { ...user },
        process.env.JWT_SECRET_KEY, // Secret key from environment variable
        { expiresIn: "24h" } // Token expiration time
      );

      res.status(200).json({
        success: true,
        data: {
          user: user,
          token: token,
        },
      });
    });

    app.get("/login-user", verifyToken, async (req, res) => {
      const user = req.user;
      if (!user?._id) {
        res.status(401).json({
          success: false,
          message: "User not login",
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    });

    app.get("/apartments-payments", verifyToken, async (req, res) => {
      const user = req.user;

      if (user?.role !== "admin") {
        res.status(401).json({
          success: false,
          message: "You can not access in this route",
        });
      }

      const result = await HistoryCollections?.find().toArray();
      res.status(200).json({
        success: true,
        data: result,
      });
    });

    app.post("/agreement", verifyToken, async (req, res) => {
      const { userId, apartmentId, agreementDate } = req.body;

      if (!userId || !apartmentId || !agreementDate) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      try {
        const apartment = await ApartmentCollections?.findOne({
          _id: new mongoose.Types.ObjectId(apartmentId),
        });

        if (apartment?.isBooking) {
          return res.status(404).json({
            success: false,
            message: "Apartment already booked",
          });
        }

        const user = await UserCollections.findOne({
          _id: new mongoose.Types.ObjectId(userId),
        });

        if (user?.bookingApartment) {
          return res.status(404).json({
            success: false,
            message: "You Already booked a Apartment",
          });
        }
        // Update the apartment collection with booking details
        const apartmentUpdate = await ApartmentCollections.updateOne(
          { _id: new mongoose.Types.ObjectId(apartmentId) }, // Find apartment by ID
          {
            $set: {
              isBooking: true,
              userId: userId,
              agreementDate: agreementDate,
            },
          }
        );

        if (apartmentUpdate.modifiedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Apartment not found or already booked",
          });
        }

        // Update the user collection with booked apartment ID
        const userUpdate = await UserCollections.updateOne(
          { _id: new mongoose.Types.ObjectId(userId) }, // Find user by ID
          {
            $set: {
              bookingApartment: apartmentId,
            },
          }
        );

        if (userUpdate.modifiedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        res.status(200).json({
          success: true,
          message: "Apartment booked successfully",
        });
      } catch (error) {
        console.error("Error processing agreement:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    app.get("/user-apartment", verifyToken, async (req, res) => {
      const user = req.user;

      try {
        const apartment = await ApartmentCollections?.findOne({
          _id: new mongoose.Types.ObjectId(user?.bookingApartment),
        });

        res.status(200).json({
          success: true,
          data: apartment,
        });
      } catch (error) {
        console.error("Error processing agreement:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // Endpoint to create a Stripe checkout session
    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      try {
        const { apartmentId, amount } = req.body;

        if (!apartmentId || !amount) {
          return res.status(400).json({ message: "Missing required fields" });
        }
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount * 100, // Convert to cents
          currency: "usd",
          metadata: {
            apartmentId: apartmentId,
            userId: req.user._id,
          },
        });

        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        console.error("Error creating Stripe payment intent:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.get("/get-user-history", verifyToken, async (req, res) => {
      const user = req?.user;
      const response = await HistoryCollections.find({
        userId: user?._id,
      }).toArray();

      res.status(200).json({
        success: true,
        data: response,
      });
    });

    app.post("/create-payment-history", verifyToken, async (req, res) => {
      try {
        const data = req.body;
        const response = await HistoryCollections.insertOne(data);

        res.status(200).json({
          success: true,
          data: response,
        });
      } catch (error) {
        console.error("Error creating Stripe payment intent:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.patch(
      "/update-payment-history-status",
      verifyToken,
      async (req, res) => {
        try {
          const { id, action } = req.body;
          const response = await HistoryCollections.updateOne(
            { _id: new ObjectId(id) }, // Filter to find the document by ID
            { $set: { status: action } } // Update the status field with the new action
          );

          res.status(200).json({
            success: true,
            data: response,
          });
        } catch (error) {
          console.error("Error creating Stripe payment intent:", error);
          res.status(500).json({ message: "Internal server error" });
        }
      }
    );

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

run().catch(console.dir);

// Root route
app.get("/", (req, res) => {
  res.send("Building management server is running");
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
