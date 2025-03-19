// Import required modules
import express, { Request, Response } from 'express';
import { MongoClient } from 'mongodb';
import axios from 'axios';

// MongoDB Connection URI
const MONGO_URI = 'mongodb://localhost:3000';
const DATABASE_NAME = 'assignmentDB';
const client = new MongoClient(MONGO_URI);

// Express App
const app = express();
app.use(express.json());

// Connect to MongoDB
async function connectDB() {
    await client.connect();
    console.log('Connected to MongoDB');
}
connectDB();

const db = client.db(DATABASE_NAME);
const usersCollection = db.collection('users');
const postsCollection = db.collection('posts');
const commentsCollection = db.collection('comments');

// Load Users, Posts, and Comments into DB
app.get('/load', async (req: Request, res: Response) => {
    try {
        const { data: users } = await axios.get('https://jsonplaceholder.typicode.com/users');
        for (const user of users) {
            const { data: posts } = await axios.get(`https://jsonplaceholder.typicode.com/posts?userId=${user.id}`);
            for (const post of posts) {
                const { data: comments } = await axios.get(`https://jsonplaceholder.typicode.com/comments?postId=${post.id}`);
                post.comments = comments;
                await commentsCollection.insertMany(comments);
            }
            user.posts = posts;
            await postsCollection.insertMany(posts);
            await usersCollection.insertOne(user);
        }
        res.status(200).send();
    } catch (error) {
        res.status(500).json({ message: 'Error loading data', error });
    }
});

// Delete all users
app.delete('/users', async (req: Request, res: Response) => {
    await usersCollection.deleteMany({});
    res.status(200).json({ message: 'All users deleted' });
});

// Delete specific user
app.delete('/users/:userId', async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    await usersCollection.deleteOne({ id: userId });
    res.status(200).json({ message: `User ${userId} deleted` });
});

// Get user with posts and comments
app.get('/users/:userId', async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    const user = await usersCollection.findOne({ id: userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
});

// Insert new user
app.put('/users', async (req: Request, res: Response) => {
    const user = req.body;
    const existingUser = await usersCollection.findOne({ id: user.id });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    await usersCollection.insertOne(user);
    res.status(201).json({ message: 'User added', user });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
