require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  // verify the token

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
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

    app.get("/upload-mock", async (req, res) => {
      data = [];
      // console.log()
      //   const deletedResult = await ApartmentCollections.deleteMany({});
      //   console.log(deletedResult);
      //   const result = await ApartmentCollections.deleteMany({
      //     price: { $gt: 1000 },
      //   });

      const result = await ApartmentCollections.insertMany(data);
      res.status(200).json({
        message: "Mock data uploaded successfully",
        insertedCount: result.insertedCount,
      });
    });

    app.get("/apartments", async (req, res) => {
      const result = await ApartmentCollections.find().toArray();
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

    app.get("/users", async (req, res) => {
      const data = req.body;
      const result = await UserCollections.find().toArray();
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
        { uid: user.uid, userId: user._id, role: user.role },
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
