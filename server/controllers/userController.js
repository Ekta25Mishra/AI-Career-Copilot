const getProfile = (req,res)=>{
  res.json({
    message:"You accessed a protected route!",
    user:req.user
  })
}

module.exports={
  getProfile
}