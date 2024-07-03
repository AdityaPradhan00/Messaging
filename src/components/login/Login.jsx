import "./login.css";
import {useState} from "react";
import { toast } from "react-toastify";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc, collection, query, where, getDocs  } from "firebase/firestore"; 
import upload from "../../lib/upload";

const Login = () => {

    const [avatar, setAvatar] = useState({
        file: null,
        url: ""
    });

    const [loading, setLoading] = useState(false);
    const [logView, setLogView] = useState(false);
    const [resView, setResView] = useState(false);

    const handleAvatar = (e) => {
        if(e.target.files[0]){
            setAvatar({
                file: e.target.files[0], 
                url: URL.createObjectURL(e.target.files[0])
            })
        }
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.target);
        const { email, password } = Object.fromEntries(formData);

        try{
            await signInWithEmailAndPassword(auth, email, password)
        }catch(err){
            console.log(err);
            toast.error(err.message);
        }finally{
            setLoading(false);
        }
    }
    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
    
        const { username, email, password } = Object.fromEntries(formData);
    
        // VALIDATE INPUTS
        if (!username || !email || !password){
            toast.warn("Please enter inputs!");
        }
        if (!avatar.file){
            toast.warn("Please upload an avatar!");
        } 
            
        // VALIDATE UNIQUE USERNAME
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            toast.warn("Select another username");
            setLoading(false);
        }
    
        try {
          const res = await createUserWithEmailAndPassword(auth, email, password);
    
          const imgUrl = await upload(avatar.file);
    
          await setDoc(doc(db, "users", res.user.uid), {
            username,
            email,
            avatar: imgUrl,
            id: res.user.uid,
            blocked: [],
          });
    
          await setDoc(doc(db, "userchats", res.user.uid), {
            chats: [],
          });
    
          toast.success("Account created! Reloading!");
          window.location.reload();
        } catch (err) {
          console.log(err);
          toast.error(err.message);
        } finally {
            setLoading(false);
            setAvatar({
                file: null,
                url: ""
            })
            
        }
      };

    const handleLogView = () => {
        setLogView(true);
        setResView(false);
    }
    const handleResView = () => {
        setResView(true);
        setLogView(false);
    }

    const shouldHideButtons = logView || resView;

    return ( 
        <div className="login" style={{flexDirection: (!shouldHideButtons) ? "column" : "row"}}> 
           <div className="version">
                <h3>Note: </h3>
                <p>Version 1.1</p>
                <div style={{marginLeft: '10px'}}>
                    <ul>
                        <li>Registration/Sign-up can be done using any email as verification has been disabled.</li>
                        <li>Implemented Basic real-time messaging functionality implemented, allowing users to send and receive messages instantly.</li>
                        <li>Image sending functionality is implemented.</li>
                        <li>Integrated face-api.js to detect the sender's emotion under well-lit conditions.</li>
                    </ul>
                </div>
                <br />
                <p>In development</p>
                <div style={{marginLeft: '15px'}}>
                    <ul>
                        <li>Voice Messaging.</li>
                        <li>End to End encryption.</li>
                        <li>Tone detection in voice messages with urgent notifications.</li>
                        <li>Improving emotion detection with a new model or custom training.</li>
                    </ul>
                </div>
            </div>
             <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
             }}> 
              <div className={!shouldHideButtons? "none": "separator"}></div> 

             {!logView && !shouldHideButtons && <button onClick={handleLogView} className="btns">Login</button>}
             {!resView && !shouldHideButtons && <button onClick={handleResView} className="btns">Register</button>}
            </div>
            {logView && 
                <div className="item">
                    <h2>Welcome back,</h2>
                    <form onSubmit={handleLogin}>
                        <input type="text" placeholder="Email" name="email" />
                        <input type="password" placeholder="Password" name="password" />
                        <button disabled={loading}>{loading ? "Logging In" : "Login"}</button>
                        <h4>OR</h4>
                    <p style={{cursor: "pointer", }} onClick={handleResView}>New? Create an Account</p>
                    </form>
                </div>
            }
            {resView &&
                <div className="item">
                    <h2>Create an Account</h2>
                        <form onSubmit={handleRegister}>
                            <label htmlFor="file">
                                <img src={avatar.url || "./avatar.png"} alt="" />
                                Upload an Image</label>
                            <input type="file" id="file" style={{display: "none"}} onChange={handleAvatar}/>
                            <input type="text" placeholder="Username" name="username" />
                            <input type="text" placeholder="Email" name="email" />
                            <input type="password" placeholder="Password" name="password" />
                            <button disabled={loading}>{loading ? "Creating..." : "Sign Up"}</button>
                            <h4>OR</h4>
                            <p style={{cursor: "pointer", }} onClick={handleLogView}>Already have an account?</p>
                        </form>
                </div>
            }
        </div> 
    )
}

export default Login;