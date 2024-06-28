import React, { useState, useEffect } from 'react';
import ChatList from './chatList/ChatList';
import './list.css';
import Userinfo from './userInfo/Userinfo';

const List = () => {
    const [listVisible, setListVisible] = useState(true);

    // State to track screen width
    const [screenWidth, setScreenWidth] = useState(window.innerWidth);

    // Update screenWidth state on window resize
    useEffect(() => {
        const handleResize = () => {
            setScreenWidth(window.innerWidth);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Function to handle item click and hide List on small screens
    const handleItemClick = () => {
        if (screenWidth < 1080) {
            setListVisible(false);
        }
    };

    return (
        <div className="list" style={{ display: listVisible ? 'block' : 'none' }}>
            <Userinfo />
            <ChatList onItemClick={handleItemClick} />
        </div>
    );
};

export default List;
