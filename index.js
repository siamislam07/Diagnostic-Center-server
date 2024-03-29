const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000

//middlewares in use
app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.DB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
})
async function run() {
    try {
        const allTestCollection = client.db('healthDb').collection('allTests')
        const usersCollection = client.db('healthDb').collection('users')
        const userTestCollection = client.db('healthDb').collection('test')

        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '3h' })
            res.send({ token })
        })

        //middleware
        const verifyToken = (req, res, next) => {
            console.log(req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized' })
                }
                req.decoded = decoded
                next()
            })
        }
        // verfy admin after verfytoken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }

        // allTest collection get method
        app.get('/allTests', async (req, res) => {
            const result = await allTestCollection.find().toArray()
            res.send(result)
        })

        app.post('/allTests', verifyToken, verifyAdmin, async (req, res) => {
            const test = req.body
            const result = await allTestCollection.insertOne(test)
            res.send(result)
        })

        app.patch('/allTests/:id', async (req, res) => {
            const test = req.body
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    title: test.title,
                    details: test.details,
                    imgUrl: test.imgUrl,
                    date: test.date,
                    price: test.price,
                    slots: test.slots
                }
            }
            const result = await allTestCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.delete('/allTests/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await allTestCollection.deleteOne(query)
            res.send(result)
        })

        // post the booking that user booked
        app.post('/userTest', async (req, res) => {
            const testItem = req.body;
            const result = await userTestCollection.insertOne(testItem)
            res.send(result)
        })


        // get all user
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {

            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        // get the test that user booked
        app.get('/userTest', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await userTestCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/userSingleTest', async(req,res)=>{
            const result = await userTestCollection.find().toArray()
            res.send(result)
        })

        // check admin or not
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        })

        //get user details
        app.get('/userDetails', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await usersCollection.find(query).toArray()
            res.send(result)
        })

        // make admin patch 
        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin',

                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)
        })
        // make user again
        app.patch('/users/user/:id', async (req, res) => {
            const id = req.params
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'user',

                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        //test delete api
        app.delete('/userTest/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await userTestCollection.deleteOne(query)
            res.send(result)
        })

        //user delete api
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        })


        // Save or modify user email, status in DB
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const query = { email: email }
            const options = { upsert: true }
            const isExist = await usersCollection.findOne(query)
            console.log('User found?----->', isExist)
            if (isExist) return res.send(isExist)
            const result = await usersCollection.updateOne(
                query,
                {
                    $set: { ...user, timestamp: Date.now() },
                },
                options
            )
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        // await client.db('admin').command({ ping: 1 })
        // console.log(
        //     'Pinged your deployment. You successfully connected to MongoDB!'
        // )
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('diagnostic server is running')
})

app.listen(port, () => {
    console.log(`server is running on por ${port}`);
})