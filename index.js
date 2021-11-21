import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken'
import dotenv from "dotenv";
import Userdata from './model/user.js'
import bcrypt from 'bcryptjs';
import TokenSchema from './model/token.js'
import crypto from "crypto";
import sendEmail from "./Utils/nodemailer.js";
dotenv.config();


const app = express();


app.use(cors());
app.use(express.json());

const connection =  async (username, password) => {
    const URL = `mongodb+srv://${username}:${password}@cluster0.k6puc.mongodb.net/login?retryWrites=true&w=majority`
    try {
        mongoose.connect(URL, {useNewUrlParser : true, useUnifiedTopology : true} )
        console.log("Database successfully connected")
    } catch (error) {
        console.log(error.message)
    }  
}
const username = process.env.DB_Username;
const password = process.env.DB_Password;

connection(username,password)


app.post("/signup", async (req, res) =>{
    try {
       await Userdata.create({
            email : req.body.email,
            password: bcrypt.hashSync(req.body.password, 4),
        })
        res.status(200).json({status: true})
    } catch (error) {
        res.status(401).json({status: false})
    }
})

app.post("/", async (req, res) =>{
    try {
     let user =  await Userdata.findOne({email : req.body.email})
        if(user)
        {
                let matchPassword = bcrypt.compareSync(req.body.password,user.password)
                if (matchPassword) {
                    let token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
                    res.json({
                        message: true,
                        token
                      });
            }  else{
                res.json({message: false})
               }
             }
        
    } catch (error) {
        res.json({message: false, error: "server connectivity error"})
    }
})

app.post("/forgetpassword", async(req,res) => {
    try {
        let user =  await Userdata.findOne({email : req.body.email})
        if (!user)
        {
             res.status(401).json({message: false})
        }
        let token = await TokenSchema.findOne({ userId: user._id });
        if (!token) {
            token = await new TokenSchema({
                userId: user._id,
                token: crypto.randomBytes(32).toString("hex"),
            }).save();
        }
      const link = `https://boopalanpasswordreset.netlify.app
      /passwordreset/${user._id}/${token.token}`;
      await sendEmail(user.email, "Password reset",`your reset password link : ${link}` );
      res.status(200).send("password reset link sent to your email account");

  } catch (error) {
      res.status(400).json({message: "error in database connection"});      
  }
})

app.post("/passwordreset/:userId/:token", async (req,res) => {
    try {
        const user = await Userdata.findById(req.params.userId);
        if (!user) return res.status(400).send("User Not Found");
  
        const token = await TokenSchema.findOne({
            userId: user._id,
            token: req.params.token,
        });
        if (!token) return res.status(406).send("Invalid link or expired");            
         let hash = bcrypt.hashSync(req.body.password, 4);
         req.body.password = hash;  
        user.password = req.body.password;
        await user.save();
        await token.delete();       
        res.status(200).send("password reset sucessfully.");
        await mongoose.disconnect();        
    } catch (error) {
      console.log(error);
        res.status(406).send("An error occured");
    }
})

const PORT = process.env.PORT || 8000;

app.listen(PORT, ()=> console.log(`Server Listening in ${PORT}`));