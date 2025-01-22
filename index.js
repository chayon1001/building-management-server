require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5174',
        'https://volunteer-management-c92d2.web.app',
        'https://volunteer-management-c92d2.firebaseapp.com'

    ],
    credentials: true
}));


app.use(express.json());
app.use(cookieParser());


const verifyToken = (req, res, next)=>{
    const token = req.cookies?.token;

    if(!token){
        return res.status(401).send({message: 'unauthorized access'})
    }

    // verify the token

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
        if(err){
            return res.status(401).send({message: 'unauthorized access'})
        }
        req.user = decoded;
        next()
    })
}

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.crj7d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();
        // console.log("Connected to MongoDB");

        // Database and collections
        // const BuildingCollections = client.db('building_management').collection('clients');
       


        // auth related APIs
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '25h' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            })
                .send({ success: true })
        })

        app.post('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            })
                .send({ success: true })
        })


       

        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

    } catch (error) {
        console.error('MongoDB connection error:', error);
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
    res.send('Building management server is running');
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});