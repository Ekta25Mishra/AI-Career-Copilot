import React from 'react'
import { useEffect } from 'react'
import { useState } from 'react'

const App = () => {
  const [message, setMessage]= useState("")

  useEffect(()=>{
    fetch("http://localhost:3000/")
    .then((response)=> response.json())
    .then((data)=>{
      setMessage(data.message);
    })
    .catch((error)=>{
      console.error("Error:", error);
    })
  },[]);

  return (
    <div>
      <h1>AI-Career Copilot</h1>
      <p>Your AI-powered career assistent.</p>
      <p>Backend says...</p>
      <strong>{message}</strong>
    </div>
  )
}

export default App