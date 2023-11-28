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

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token
    console.log(token)
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log(err)
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded
        next()
    })
}

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

        // allTest collection get method
        app.get('/allTests', async(req,res)=>{
            const result = await allTestCollection.find().toArray()
            res.send(result)
        })

        // post the booking that user booked
        app.post('/userTest', async(req,res)=>{
            const testItem = req.body;
            const result = await userTestCollection.insertOne(testItem)
            res.send(result)
        })

        // get all user
        app.get('/users', async(req,res)=>{
            const result = await usersCollection.find().toArray()
            res.send(result)
        })
        
        // get the test that user booked
        app.get('/userTest', async(req,res)=>{
            const email = req.query.email
            const query = {email: email}
            const result = await userTestCollection.find(query).toArray()
            res.send(result)
        })

        //get user details
        app.get('/userDetails', async(req,res)=>{
            const email = req.query.email
            const query = {email: email}
            const result = await usersCollection.find(query).toArray()
            res.send(result)
        })

        //test delete api
        app.delete('/userTest/:id', async(req,res)=>{
            const id = req.params.id
            const query = {_id: new ObjectId(id)}
            const result = await userTestCollection.deleteOne(query)
            res.send(result)
        })

        //user delete api
        app.delete('/users/:id', async(req,res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        })


        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body
            console.log('I need a new jwt', user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '365d',
            })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ success: true })
        })

        // Logout
        app.get('/logout', async (req, res) => {
            try {
                res
                    .clearCookie('token', {
                        maxAge: 0,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                    })
                    .send({ success: true })
                console.log('Logout successful')
            } catch (err) {
                res.status(500).send(err)
            }
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
        await client.db('admin').command({ ping: 1 })
        console.log(
            'Pinged your deployment. You successfully connected to MongoDB!'
        )
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