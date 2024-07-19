import AddUser from "./addUser/addUser";
import "./chatList.css";
import {useEffect, useState} from "react";
import { useUserStore } from "../../../lib/userStore"
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useChatStore } from "../../../lib/chatStore";
import forge from 'node-forge';

const ChatList = ({onItemClick }) => {
    const [addMode, setAddMode] = useState(false);
    const [chats, setChats] = useState([]);
    const [input, setInput] = useState("");

    const{ currentUser }= useUserStore();
    const{ chatId, changeChat }= useChatStore();

    // Decrypt message using RSA private key
    const decryptMessage = (encryptedMessage) => {
        try {
            const privateKeyPem = localStorage.getItem('privateKey');
            if (!privateKeyPem) {
                throw new Error('Private key not found in local storage.');
            }

            const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
            const decoded = forge.util.decode64(encryptedMessage);
            const decrypted = privateKey.decrypt(decoded, 'RSA-OAEP');
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error.message);
            return null;
        }
    };

    const renderMessage = (encryptedMessage) => {
        const decryptedMessage = decryptMessage(encryptedMessage);
        if (decryptedMessage) {
            return <p>{decryptedMessage}</p>;
        } else {
            return null;
        }
    };
    useEffect(() =>{
        const unSub = onSnapshot(doc(db, "userchats", currentUser.id), async (res) => {
            const items = res.data().chats;

            const promises = items.map( async (item) => {
                 const userDocRef = doc(db, "users", item.receiverId);
                 const userDocSnap = await getDoc(userDocRef);

                 const user = userDocSnap.data();

                 return {...item, user};
            });

            const chatData = await Promise.all(promises);

            setChats(chatData.sort((a, b) => b.updatedAt - a.updatedAt));
        });

        return () => {
            unSub()
        }
    }, [currentUser.id]);

    const handleSelect = async (chat) => {
        const userChats = chats.map(item => {
            const { user, ...rest } = item;
            return rest;
        });

        const chatIndex = userChats.findIndex((item) => item.chatId === chat.chatId);

        userChats[chatIndex].isSeen = true;

        const userChatsRef = doc(db, "userchats", currentUser.id);

        try{
            await updateDoc(userChatsRef, {
                chats: userChats,
            })
            changeChat(chat.chatId, chat.user)
            onItemClick();
        }catch(err){
            console.log(err);
        }
    }

    const filteredChats = chats.filter(c => c.user.username.toLowerCase().includes(input.toLowerCase()));
console.log(currentUser.id)
console.log(chats)
    return (
        <div className="chatList">
            <div className="search">
                <div className="searchBar">
                    <img src="./search.png" alt="" />
                    <input type="text" placeholder="Search" onChange={(e) => setInput(e.target.value)}/>
                </div>
                <img src={addMode ? "./minus.png" : "./plus.png"} alt="" className="add"
                onClick={() => setAddMode((prev) => !prev)} />
            </div>
            {filteredChats.map((chat) => 
            <div className="item" key={chat.chatId} onClick={() => handleSelect(chat)}
            style={{
                backgroundColor: chat?.isSeen ? "transparent" : "#5183fe",
            }}>
                <img src={chat.user.blocked.includes(currentUser.id)? "./avatar.png" : chat.user.avatar || "./avatar.png"} alt="" />
                <div className="texts">
                    <span>{chat.user.blocked.includes(currentUser.id)
                        ? "User" : chat.user.username}</span>
                        {renderMessage(chat.lastMessage)}
                        {renderMessage(chat.myLastMessage)}
                </div>
            </div>
            )}
            {addMode && <AddUser props={chats} />}
        </div>
    )
}


export default ChatList;