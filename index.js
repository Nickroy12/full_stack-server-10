const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.NEXT_PUBLIC_SERVER_URL || 5000;
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    app.get("/api/recipe", async (req, res) => {
      const query = {};
      if (req.query.userId) {
        query.userId = req.query.userId;
      }
      if (req.query.status) {
        query.status = req.query.status;
      }
      const cursor = recipeCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get('/api/plans', async(req,res)=>{
      const query ={}
    
      if(req.query.plan_id){
        query.id = req.query.plan_id
      }
      const result = await planCollections.findOne(query)
      res.send(result)
    })
    app.get("/api/recipe/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await recipeCollection.findOne(query);
      res.send(result);
    });

    app.patch("/api.recipe/:id", async (req, res) => {
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
    app.post("/api/recipe", async (req, res) => {
      const recipe = req.body;
      const result = await recipeCollection.insertOne(recipe);
      res.send(result);
    });
app.patch("/api/recipe/:id/like", async (req, res) => {
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
app.post('/api/subscription', async(req ,res)=>{
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
   app.get("/api/subscription", async (req, res) => {
      const query = {};
      if (req.query.sub_id) {
        query.email = req.query.sub_id;
      }
    
      const cursor = subscriptions.find(query);
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
