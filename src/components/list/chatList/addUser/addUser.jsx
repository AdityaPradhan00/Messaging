import { arrayUnion, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import "./addUser.css";
import { db } from "../../../../lib/firebase";
import { useEffect, useState } from "react";
import { useUserStore } from "../../../../lib/userStore";

const AddUser = ({ props }) => {
    const [user, setUser] = useState(null);
    const [vis, setVis] = useState(true);

    const { currentUser } = useUserStore();

    useEffect(() => {
        const check = () => {
            if (user) {
                const found = props.some(prop => {
                    if (prop.receiverId === user.id) {
                        setVis(false);
                        return true;
                    }
                    return false;
                });
                if (!found) {
                    setVis(true);
                }
            } else {
                console.log('User does not exist');
            }
        };
        check();
    }, [user]);

    const handleSearch = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get("username");

        try {
            const userRef = collection(db, "users");
            const q = query(userRef, where("username", "==", username));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                setUser(querySnapshot.docs[0].data());
            }
        } catch (err) {
            console.log(err);
        }
    };

    const handleAdd = async () => {
        setVis(false);
        const chatRef = collection(db, "chats");
        const userChatsRef = collection(db, "userchats");

        try {
            // Create a new chat document
            const newChatRef = doc(chatRef);
            await setDoc(newChatRef, {
                createdAt: serverTimestamp(),
                messages: [],
            });

            // Fetch public keys of both users
            const currentUserDoc = await getDoc(doc(db, "users", currentUser.id));
            const addedUserDoc = await getDoc(doc(db, "users", user.id));

            const currentUserPublicKey = currentUserDoc.data().publicKey;
            const addedUserPublicKey = addedUserDoc.data().publicKey;

            // Update userchats collection with chat details
            await updateDoc(doc(userChatsRef, user.id), {
                chats: arrayUnion({
                    chatId: newChatRef.id,
                    lastMessage: "",
                    receiverId: currentUser.id,
                    receiverPublicKey: currentUserPublicKey, // Add receiver's public key
                    updatedAt: Date.now(),
                })
            });

            await updateDoc(doc(userChatsRef, currentUser.id), {
                chats: arrayUnion({
                    chatId: newChatRef.id,
                    lastMessage: "",
                    receiverId: user.id,
                    receiverPublicKey: addedUserPublicKey, // Add receiver's public key
                    updatedAt: Date.now(),
                })
            });

            console.log(newChatRef.id, "SS");
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <div className="addUser">
            <form onSubmit={handleSearch}>
                <input type="text" placeholder="Username" name="username" />
                <button>Search</button>
            </form>
            {user && <div className="user">
                <div className="detail">
                    <img src={user.avatar || "./avatar.png"} alt="" />
                    <span>{user.username}</span>
                </div>
                {vis && <button onClick={handleAdd}>Add User</button>}
            </div>}
        </div>
    );
};

export default AddUser;
