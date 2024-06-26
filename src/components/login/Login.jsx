import "./login.css";
import {useState} from "react";
import { toast } from "react-toastify";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore"; 
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
            console.log("SSS")
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
        try{
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

            toast.success("Account created, Login to use the application.")

        }catch(err){
            console.log(err);
            toast.error(err.message);
        } finally{
            setLoading(false);
        }
    }

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
        <div className="login">
             <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px"
             }}>
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
                            <button disabled={loading}>{loading ? "Creating" : "Sign Up"}</button>
                            <h4>OR</h4>
                            <p style={{cursor: "pointer", }} onClick={handleLogView}>Already have an account?</p>
                        </form>
                </div>
            }
        </div> 
    )
}

export default Login;