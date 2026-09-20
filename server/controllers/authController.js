const bcrypt = require("bcryptjs")
const jwt= require("jsonwebtoken")
const User= require("../models/User")

const registerUser = async(req,res)=>{
  try{
    const {name,email,password}= req.body;
    if(!name || !email || !password){
      return res.status(400).json({
        message:"All fields are required!"
      })
    }
    const existingUser = await User.findOne({email})

    if(existingUser){
      return res.status(400).json({
        message:"User already exists."
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      name,
      email,
      password:hashedPassword
    })

    res.status(201).json({
      message:"User registered successfully",
      user:{
        id:user._id,
        name:user.name,
        email:user.email
      }
    })
  }
  catch(err){
    res.status(500).json({
      message:err.message
    })    
  }
}

const loginUser = async(req,res)=>{
  try{
    const {email, password}= req.body;
    if(!email || !password){
      return res.status(400).json({
        message:"Email and password both are required!"
      })
    }

    const user = await User.findOne({email})

    if(!user){
      return res.status(401).json({
        message:"Invalid credentials!"
      })
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password)

    if(!isPasswordCorrect){
      return res.status(401).json({
        message:"Invalid Credentials!"
      })
    }

    const token= jwt.sign(
      {
        userId:user._id
      },
      process.env.JWT_SECRET,
      {
        expiresIn:"7d"
      }
    );

    res.status(200).json({
      message:"Login Successfully!",
      token,
      user:{
        id:user._id,
        name:user.name,
        email:user.email
      }
    })

  }catch(err){
    res.status(500).json({
      message:err.message
    })
  }
}


module.exports={
  registerUser,
  loginUser
}