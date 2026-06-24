const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.NEXT_PUBLIC_SERVER_URL || 5000;
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const uri = process.env.MONGODB_URL;
app.use(cors());
app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const jwks = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))

app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function run() {
  try {
    const db = client.db("fullstack_db");
    const recipeCollection = db.collection("recipes");
    const planCollections = db.collection('plans')
    const subscriptions = db.collection('subscription')
    const userCollections = db.collection('user')
    const sessionCollection = db.collection('session');
 const usersCollection = db.collection("user");
 const paymentCollections = db.collection('payment')

const verifyToken = async (req, res, next) => {

            const authHeader = req.headers?.authorization;
            console.log(authHeader , 'ay');
            if (!authHeader) {

                return res.status(401).send({ message: 'unauthorized access' })
            }

            const token = authHeader.split(' ')[1]

            if (!token) {
                return res.status(401).send({ message: 'unauthorized access' })
            }

            const query = { token: token }
            const session = await sessionCollection.findOne(query);

              if (!session) {
                return res.status(401).send({ message: 'unauthorized access' })
            }

            const userId = session.userId;


            const userQuery = {
                _id: userId
            }

            const user = await usersCollection.findOne(userQuery);
              if (!user) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            // set data in the req objecto
            req.user = user;
            next();
        }


    app.get("/api/recipes", async (req, res) => {
      const query = {};
      if (req.query.userId) {
        query.userId = req.query.userId;
      }
      if (req.query.status) {
        query.status = req.query.status;
      }
      const cursor = recipeCollection.find(query);
      const result = await cursor.toArray();
      // console.log(result , "res");
      res.send(result);
    });
    app.get("/api/recipe/filter",verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 6, categories, userId, status } = req.query;
    
    // 1. Build the query object
    const query = {};

    if (userId) query.userId = userId;
    if (status) query.status = status;

    // Handle multiple categories using $in
    if (categories) {
      // Expecting a comma-separated string from frontend (e.g., "Dessert,Breakfast")
      const categoryArray = categories.split(",");
      query.category = { $in: categoryArray };
    }

    // 2. Setup Pagination variables
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const maxLimit = parseInt(limit);

    // 3. Fetch data and total count for frontend calculations
    const totalRecipes = await recipeCollection.countDocuments(query);
    const recipes = await recipeCollection
      .find(query)
      .sort({ _id: -1 }) // Sorts by newest first (replaces frontend .reverse())
      .skip(skip)
      .limit(maxLimit)
      .toArray();

    res.send({
      recipes,
      totalPages: Math.ceil(totalRecipes / maxLimit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).send({ message: "Error fetching filtered recipes", error });
  }
});
    app.get('/api/plans',  async(req,res)=>{
      const query ={}
    
      if(req.query.plan_id){
        query.id = req.query.plan_id
      }
      const result = await planCollections.findOne(query)
      res.send(result)
    })
    app.get("/api/recipe/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await recipeCollection.findOne(query);
      res.send(result);
    });

    app.patch("/api/recipe/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updateStatus = req.body;
      const filter = {
        _id: new ObjectId(id),
      };
      const updateDoc = {
        $set: {
          status: updateStatus.status,
        },
      };
      const result = await recipeCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.post("/api/recipe", verifyToken,  async (req, res) => {
      const recipe = req.body;
      const result = await recipeCollection.insertOne(recipe);
      res.send(result);
    });
app.patch("/api/recipe/:id/like", verifyToken, async (req, res) => {
  const id = req.params.id;
  const { userId } = req.body; // ফ্রন্টএন্ড থেকে { userId } অবজেক্ট আকারে আসবে
  const filter = { _id: new ObjectId(id) };

  const recipe = await recipeCollection.findOne(filter);

  // ইউজার আগে লাইক করেছে কিনা চেক
  const hasLiked = recipe.likedBy && recipe.likedBy.includes(userId);

  let updateDoc = {};

  if (!hasLiked) {
    updateDoc = {
      $inc: { likesCount: 1 },
      $push: { likedBy: userId },
    };
  } else {
    updateDoc = {
      $inc: { likesCount: -1 },
      $pull: { likedBy: userId },
    };
  }

  const result = await recipeCollection.updateOne(filter, updateDoc);
  
  
  res.send({ result, hasLiked: !hasLiked });
});
app.post('/api/subscription', verifyToken, async(req ,res)=>{
  const data = req.body
   const subInfo = {
    ...data,
    createdAt:new Date()
   }
   const result = await subscriptions.insertOne(subInfo)
   const filter = {email : data.email}

    const updateDocument = {
            $set:{
              plan:data.plansId
            }
    }
   
    const updatedResult = await userCollections.updateOne(filter , updateDocument)
    res.send(updatedResult)
})
   app.get("/api/subscription",verifyToken, async (req, res) => {
      const query = {};
      if (req.query.sub_id) {
        query.email = req.query.sub_id;
      }
    
      const cursor = subscriptions.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.post('/api/payment',verifyToken, async(req,res)=>{
      const payData = req.body
      const payInfo ={
        ...payData,
        createdAt: new Date()
      }
      const result = await paymentCollections.insertOne(payInfo)
      res.send(result)
    })
      app.get("/api/payment",verifyToken, async (req, res) => {
      const query = {};
      if (req.query.pay_id) {
        query.email = req.query.pay_id;
      }
    
      const cursor = paymentCollections.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
