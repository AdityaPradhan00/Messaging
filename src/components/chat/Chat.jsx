import React, { useRef, useEffect, useState } from 'react';
import "./chat.css"
import EmojiPicker from "emoji-picker-react";
import { onSnapshot, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import upload from "../../lib/upload"
import * as faceapi from 'face-api.js';
import { toast } from 'react-toastify';

const Chat = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [emoData, setEmoData] = useState('');
    const [emotionCounts, setEmotionCounts] = useState({});

    useEffect(() => {
        startVideo();
        loadModels();
      }, []);
    
      const startVideo = () => {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(currentStream => {
            videoRef.current.srcObject = currentStream;
          })
          .catch(err => {
            console.log(err);
          });
      };
    
      const loadModels = async () => {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
          faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        ]);
      };
    
      const startFaceDetection = async () => {
        try {
          const initialEmotionCounts = {};
          let isFirstDetection = true;
    
  
            const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceExpressions();
    
            canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(videoRef.current);
            faceapi.matchDimensions(canvasRef.current, { width: 940, height: 650 });
    
            const resizedDetections = faceapi.resizeResults(detections, { width: 940, height: 650 });
    
            faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
    
            // Track emotion prevalence from the first detection
            if (isFirstDetection) {
              resizedDetections.forEach(result => {
                const expressions = result.expressions;
                const dominantExpression = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
                initialEmotionCounts[dominantExpression] = (initialEmotionCounts[dominantExpression] || 0) + 1;
              });
              setEmotionCounts(initialEmotionCounts);
              isFirstDetection = false;
            } else {
              resizedDetections.forEach(result => {
                const expressions = result.expressions;
                const dominantExpression = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
                setEmotionCounts(prevCounts => ({
                  ...prevCounts,
                  [dominantExpression]: (prevCounts[dominantExpression] || 0) + 1
                }));
              });
            }
    
            await new Promise(resolve => setTimeout(resolve, 100)); // Adjust delay as needed
          }catch (error) {
          console.error("Face detection error:", error);
        }
      };
    
      const handleStartDetection = () => {
        startFaceDetection();
      };
    
      const calculateEmoData = () => {
        try{
        const mostPrevalentEmotion = Object.keys(emotionCounts).reduce((a, b) => emotionCounts[a] > emotionCounts[b] ? a : b);
        const maxCount = emotionCounts[mostPrevalentEmotion] || 0;
        const confidence = maxCount / Object.values(emotionCounts).reduce((a, b) => a + b, 0) * 100;
        
        console.log( mostPrevalentEmotion, confidence.toFixed(2))
        return {
            emotion: mostPrevalentEmotion,
            confidence: confidence.toFixed(2)
        };
      }catch(err){
        toast.warn("Emotion not detected!")
        console.log(err)
      }
    };

    const [open, setOpen] = useState(false);
    const [drop, setDrop] = useState(false);
    const [text, setText] = useState("");
    const [chat, setChat] = useState("");
    const [sending, setSending] = useState(false);
    const [img, setImg] = useState({
        file: null,
        url: "",
    });
    const{ chatId, user, isCurrentUserBlocked, isReceiverBlocked, }= useChatStore();
    const{ currentUser }= useUserStore();

    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({behaviour: "smooth"});
    }, [chat.messages]);

    useEffect(() => {
        const unSub = onSnapshot(doc(db, "chats", chatId), (res) => {
            setChat(res.data());
        });
        return () => {
            unSub();
        }
    }, [chatId]);

    const handleEmoji = (e) => {
        setText((prev) => prev+e.emoji);
        setOpen(false);
    }
    const handleSend = async () => {
        setSending(true);
        if (text === "") {
          setSending(false);
          return;
        }
      
        const dataToSend = calculateEmoData();
        setEmoData(dataToSend)

        let imgUrl = null;
        try {
          // Upload image if available
          if (img.file) {
            imgUrl = await upload(img.file);
          }
      
          // Update chat document with message data including emoData
          await updateDoc(doc(db, "chats", chatId), {
            messages: arrayUnion({
              senderId: currentUser.id,
              text,
              createdAt: new Date(),
              ...(imgUrl && { img: imgUrl }),
              ...(emoData && {emoData: dataToSend}),
               // Conditionally add imgUrl if it exists
            }),
          });
      
          // Update user's chat list
          const userIDs = [currentUser.id, user.id];
          userIDs.forEach(async (id) => {
            const userChatsRef = doc(db, "userchats", id);
            const userChatsSnapshot = await getDoc(userChatsRef);
      
            if (userChatsSnapshot.exists()) {
              const userChatsData = userChatsSnapshot.data();
      
              const chatIndex = userChatsData.chats.findIndex((c) => c.chatId === chatId);
      
              userChatsData.chats[chatIndex].lastMessage = text;
              userChatsData.chats[chatIndex].isSeen = id === currentUser.id ? true : false;
              userChatsData.chats[chatIndex].updatedAt = Date.now();
      
              await updateDoc(userChatsRef, {
                chats: userChatsData.chats,
              });
            }
          });
        } catch (err) {
          console.log(err);
        } finally {
          setSending(false);
          setText('');
          setImg({file: null,
            url: "",}) // Reset sending state
        }
      };

    const handleImg = (e) => {
        if(e.target.files[0]){
            setImg({
                file: e.target.files[0],
                url: URL.createObjectURL(e.target.files[0])
            });
        }
    } 
    const handleTime = (e) => {
        const createdAt = e.toDate(); // Convert Firestore timestamp to JavaScript Date object

        // Custom format function to display date without seconds
        const formattedDate = `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        return(
            formattedDate        
        )
    }
    
    return (
        <div className="chat">
            <div className="top">
                <img src="./arrowLeft.png" alt="" className="back" onClick={() => window.location.reload()}/>
                <div className="user">
                    <img src={user?.avatar || "./avatar.png"} alt="" />
                    <div className="texts">
                        <span>{user?.username}</span>
                        <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. </p>
                    </div>
                </div>
                <div className="icons">
                    <button onClick={() => auth.signOut()}>Logout</button>
                    {/* <img src="./phone.png" alt="" />
                    <img src="./video.png" alt="" />
                    <img src="./info.png" alt="" /> */}
                </div>
            </div>

            <div className="center">
                {chat?.messages?.map((message) => (
                    <div className={message.senderId === currentUser?.id ? "message own" : "message"} key={message?.createdAt}>
                    <div className="texts">
                        {message.img && <img src={message.img} alt="" />}
                        <p>{message.text}</p>
                        {message.emoData && ( 
                          <div style={{display:'flex', alignItems:'flex-end', justifyContent:'flex-end', backgroundColor: 'rgba(17, 25, 40, 0.3)'}}>
                              <p style={{fontSize: '12px', backgroundColor:'transparent'}}>Emotion: {message.emoData.emotion}</p>
                              <p style={{fontSize: '12px', backgroundColor:'transparent'}}>Confidence: {message.emoData.confidence}%</p>
                              {/* Add other emotion data fields as needed */}
                          </div>
                        )}
                        <span>{handleTime(message.createdAt)}</span>
                    </div>
                </div>
            ))}
            {
                img.url && 
                <div className="message own">
                    <div className="texts">
                        <img src={img.url} alt="" />
                    </div>
                </div>
            }
                <div ref={endRef}></div>
            </div>
            <div className="bottom">
                <div className="icons">
                    <label htmlFor="file">
                        <img src="./img.png" alt="" />
                    </label>
                    <input type="file"  id="file" onChange={handleImg} style={{display: "none"}}/>
                    <img src="./mic.png" alt="" />
                </div>
                <div className='appvide'>
                  <video style={{display: "none"}} crossOrigin="anonymous" ref={videoRef} autoPlay></video>
                </div>
                <canvas style={{display: "none"}} ref={canvasRef} width="940" height="650" className="appcanvas" />
                <input 
                    type="text" 
                    placeholder={(isCurrentUserBlocked || isReceiverBlocked) ? "Blocked! Cannot send a message " : "Type a message..." }
                    value={text} 
                    onChange={(e) => {
                        setText(e.target.value);
                        handleStartDetection();
                      }}                  
                      disabled={isCurrentUserBlocked || isReceiverBlocked}/>
                <div className="emoji">
                    <img src="./emoji.png" alt="" onClick={() => setOpen((prev) => !prev)}/>
                    <div className="picker">
                        <EmojiPicker open={open} onEmojiClick={handleEmoji}/>
                    </div>
                </div>
                <div className='appvide'>
                  <video style={{display: "none"}} crossOrigin="anonymous" ref={videoRef} autoPlay></video>
                </div>
                <canvas style={{display: "none"}} ref={canvasRef} width="940" height="650" className="appcanvas" />
                <button className="sendButton" onClick={handleSend} disabled={isCurrentUserBlocked || isReceiverBlocked || sending}>{sending ? "Sending" : "Send"}</button>
            </div>
        </div>
    )
}


export default Chat;